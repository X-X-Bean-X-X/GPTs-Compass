using System;
using System.IO;
using System.Linq;
using cohtml.Net;
using Colossal.Serialization.Entities;
using Colossal.UI;
using Colossal.UI.Binding;
using Game;
using Game.Input;
using Game.Rendering;
using Game.SceneFlow;
using Game.UI;
using Game.UI.InGame;
using Game.UI.Menu;
using Unity.Entities;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GTPCompass
{
    public sealed class CompassHudSystem : UISystemBase
    {
        private const string Group = "gtpCompass";
        private const string DialHost = "gtp-compass";
        private CameraUpdateSystem m_Camera;
        private GameScreenUISystem m_GameScreen;
        private OptionsUISystem m_OptionsScreen;
        private CompassSettings m_Settings;
        private UIView m_View;
        private string m_Script;
        private string m_DialDirectory;
        private bool m_Installed;
        private bool m_LayoutDirty;
        private bool m_HotkeysDirty;
        private CompassPlacement? m_LastPlacement;
        private CompassStyle? m_LastStyle;
        private (bool visible, float north, bool northUp, int modifiers, bool turn, bool restore)? m_LastDisplay;
        private ProxyAction[] m_Shortcuts;
        private CameraView? m_Previous;

        protected override void OnCreate()
        {
            base.OnCreate();
            m_Camera = World.GetOrCreateSystemManaged<CameraUpdateSystem>();
            m_GameScreen = World.GetOrCreateSystemManaged<GameScreenUISystem>();
            m_OptionsScreen = World.GetOrCreateSystemManaged<OptionsUISystem>();
            m_Settings = Mod.Settings;
            var assembly = typeof(Mod).Assembly;
            using var script = new System.IO.StreamReader(assembly.GetManifestResourceStream("GTPCompass.Hud.js"));
            m_Script = script.ReadToEnd();
            var modManager = GameManager.instance.modManager;
            string assemblyPath = modManager.TryGetExecutableAsset(assembly, out var executable) ? executable.path : assembly.Location;
            if (!string.IsNullOrEmpty(assemblyPath))
            {
                m_DialDirectory = Path.GetDirectoryName(assemblyPath);
            }
            m_Shortcuts = new[]
            {
                m_Settings.GetAction(CompassSettings.TurnNorth),
                m_Settings.GetAction(CompassSettings.ReturnToPreviousView),
                m_Settings.GetAction(CompassSettings.OpenOptions)
            };
            foreach (var shortcut in m_Shortcuts)
            {
                shortcut.onChanged += HotkeyChanged;
            }
            AddBinding(new TriggerBinding(Group, "ready", RefreshHud));
            AddBinding(new TriggerBinding(Group, "turnNorth", TurnNorth));
            AddBinding(new TriggerBinding(Group, "returnToPreviousView", ReturnToPreviousView));
            AddBinding(new TriggerBinding(Group, "openOptions", OpenOptions));
            AddBinding(new TriggerBinding<string>(Group, "setStyle", SetStyle));
            AddBinding(new TriggerBinding<string>(Group, "setPlacement", SetPlacement));
            AddBinding(new TriggerBinding<float, float, float>(Group, "saveLayout", SaveLayout));
        }

        protected override void OnGamePreload(Purpose purpose, GameMode mode)
        {
            base.OnGamePreload(purpose, mode);
            m_Previous = null;
            SetShortcutsEnabled(false);
            m_View?.View?.TriggerEvent(Group + ".state", false, 0f, false, 0, false, false);
            RefreshHud();
        }

        protected override void OnUpdate()
        {
            var ui = GameManager.instance.userInterface;
            if (m_View != ui?.view)
            {
                DetachView();
                m_View = ui?.view;
                if (m_View != null)
                {
                    if (!string.IsNullOrEmpty(m_DialDirectory))
                    {
                        m_View.uiSystem.AddHostLocation(DialHost, m_DialDirectory, shouldWatch: false);
                    }
                    m_View.Listener.ReadyForBindings += OnReadyForBindings;
                }
                OnReadyForBindings();
            }

            var view = m_View?.View;
            if (view == null || !view.IsReadyForBindings())
            {
                SetShortcutsEnabled(false);
                return;
            }
            if (!m_Installed)
            {
                view.ExecuteScript(m_Script);
                m_Installed = true;
            }

            bool visible = HudVisible;
            var controller = ViewController;
            bool canTurn = controller != null && !MapTilesUISystem.mapTileViewActive;
            bool canRestore = canTurn && m_Previous.HasValue && m_Previous.Value.Matches(controller);
            if (m_Previous.HasValue && !m_Previous.Value.Matches(controller))
            {
                m_Previous = null;
            }
            bool allowKeys = visible && Application.isFocused && !InputManager.instance.hasInputFieldFocus;
            SetShortcutsEnabled(allowKeys);
            if (allowKeys)
            {
                if (m_Shortcuts[0].WasPressedThisFrame()) TurnNorth();
                else if (m_Shortcuts[1].WasPressedThisFrame()) ReturnToPreviousView();
                else if (m_Shortcuts[2].WasPressedThisFrame()) OpenOptions();
            }

            var keyboard = Keyboard.current;
            int modifiers = 0;
            if (visible && Application.isFocused && keyboard != null && keyboard.ctrlKey.isPressed)
            {
                modifiers = keyboard.shiftKey.isPressed ? 2 : 1;
            }
            // Reading the rendered camera's right axis also works in a straight-down view.
            var right = visible ? m_Camera.activeCamera.transform.right : Vector3.right;
            float north = Mathf.Round(Mathf.Atan2(right.z, right.x) * Mathf.Rad2Deg * 4f) * 0.25f;
            Publish(view, (HudVisible, north, m_Settings.Orientation == CompassOrientation.NorthUp,
                modifiers, canTurn, canRestore));
        }

        private bool HudVisible =>
            m_Settings.Enabled &&
            GameManager.instance.gameMode == GameMode.Game &&
            !GameManager.instance.isGameLoading &&
            GameManager.instance.userInterface.overlayBindings.currentlyActiveScreen == OverlayScreen.None &&
            m_GameScreen.activeScreen == GameScreenUISystem.GameScreen.Main &&
            ViewController != null &&
            m_Camera.activeCamera != null;

        private IGameCameraController ViewController
        {
            get
            {
                var active = m_Camera.activeCameraController;
                return active is CameraController ||
                       active is OrbitCameraController orbit && orbit.mode == OrbitCameraController.Mode.Follow
                    ? active : null;
            }
        }

        private void SetShortcutsEnabled(bool value)
        {
            foreach (var shortcut in m_Shortcuts)
            {
                if (shortcut.shouldBeEnabled != value)
                {
                    shortcut.shouldBeEnabled = value;
                }
            }
        }

        private void OnReadyForBindings()
        {
            m_Installed = false;
            RefreshHud();
        }

        private void RefreshHud()
        {
            m_LastDisplay = null;
            m_LastPlacement = null;
            m_LastStyle = null;
            m_LayoutDirty = true;
            m_HotkeysDirty = true;
        }

        private void HotkeyChanged(ProxyAction shortcut)
        {
            m_HotkeysDirty = true;
        }

        private void Publish(View view, (bool visible, float north, bool northUp, int modifiers, bool turn, bool restore) display)
        {
            var placement = m_Settings.Placement;
            if (m_LastPlacement != placement)
            {
                m_LastPlacement = placement;
                view.TriggerEvent(Group + ".placement", placement.ToString());
            }
            var style = m_Settings.Style;
            if (m_LastStyle != style)
            {
                m_LastStyle = style;
                view.TriggerEvent(Group + ".style", style.ToString());
            }
            if (m_LayoutDirty)
            {
                m_LayoutDirty = false;
                view.TriggerEvent(Group + ".layout", m_Settings.PositionX, m_Settings.PositionY,
                    m_Settings.Size, CompassSettings.MinimumSize, CompassSettings.MaximumSize);
            }
            if (m_HotkeysDirty)
            {
                m_HotkeysDirty = false;
                view.TriggerEvent(Group + ".hotkeys",
                    FormatHotkeys(m_Settings.TurnNorthBinding, m_Settings.TurnNorthGamepadBinding),
                    FormatHotkeys(m_Settings.ReturnToPreviousViewBinding, m_Settings.ReturnToPreviousViewGamepadBinding),
                    FormatHotkeys(m_Settings.OpenOptionsBinding, m_Settings.OpenOptionsGamepadBinding));
            }
            if (m_LastDisplay != display)
            {
                m_LastDisplay = display;
                view.TriggerEvent(Group + ".state", display.visible, display.north, display.northUp,
                    display.modifiers, display.turn, display.restore);
            }
        }

        private static string FormatHotkeys(ProxyBinding keyboard, ProxyBinding gamepad)
        {
            string keyboardLabel = keyboard.isSet
                ? string.Join(" + ", keyboard.ToHumanReadablePath())
                : string.Empty;
            if (!gamepad.isSet)
            {
                return keyboardLabel;
            }
            string gamepadLabel = string.Join(" + ",
                (gamepad.modifiers?.Select(modifier => modifier.m_Path) ?? Enumerable.Empty<string>())
                .Append(gamepad.path).Select(FormatControllerButton));
            return keyboardLabel.Length == 0 ? gamepadLabel : keyboardLabel + " / " + gamepadLabel;
        }

        private static string FormatControllerButton(string path)
        {
            const InputControlPath.HumanReadableStringOptions options =
                InputControlPath.HumanReadableStringOptions.OmitDevice |
                InputControlPath.HumanReadableStringOptions.UseShortNames;
            var gamepad = Gamepad.current;
            if (gamepad != null && InputControlPath.TryFindControl(gamepad, path) is InputControl button)
            {
                return button.shortDisplayName ?? button.displayName;
            }
            return Game.Input.ControlPath.Get(path).name switch
            {
                "buttonNorth" => "Y",
                "buttonEast" => "B",
                "buttonSouth" => "A",
                "buttonWest" => "X",
                _ => InputControlPath.ToHumanReadableString(path, options)
            };
        }

        private void SetStyle(string name)
        {
            if (!HudVisible || !Enum.TryParse(name, out CompassStyle style) ||
                !Enum.IsDefined(typeof(CompassStyle), style) || m_Settings.Style == style)
            {
                return;
            }
            m_Settings.Style = style;
            m_Settings.ApplyAndSave();
        }

        private void SaveLayout(float x, float y, float size)
        {
            if (!HudVisible || m_Settings.Placement == CompassPlacement.Anchored ||
                !math.all(math.isfinite(new float3(x, y, size))))
            {
                return;
            }
            m_Settings.PositionX = math.saturate(x);
            m_Settings.PositionY = math.saturate(y);
            m_Settings.Size = math.clamp(size, CompassSettings.MinimumSize, CompassSettings.MaximumSize);
            m_Settings.ApplyAndSave();
        }

        private void SetPlacement(string name)
        {
            if (!HudVisible || !Enum.TryParse(name, out CompassPlacement placement) ||
                !Enum.IsDefined(typeof(CompassPlacement), placement) || m_Settings.Placement == placement)
            {
                return;
            }
            m_Settings.Placement = placement;
            m_Settings.ApplyAndSave();
        }

        private void TurnNorth()
        {
            if (!HudVisible || MapTilesUISystem.mapTileViewActive)
            {
                return;
            }
            var controller = ViewController;
            var rotation = controller.rotation;
            if (Mathf.Abs(Mathf.DeltaAngle(rotation.y, 0f)) < 0.01f)
            {
                return;
            }
            m_Previous = new CameraView(controller);
            rotation.y = 0f;
            controller.rotation = rotation;
        }

        private void ReturnToPreviousView()
        {
            if (!HudVisible || MapTilesUISystem.mapTileViewActive || !m_Previous.HasValue ||
                !m_Previous.Value.Matches(ViewController))
            {
                return;
            }
            m_Previous.Value.Restore();
            m_Previous = null;
        }

        private void OpenOptions()
        {
            if (HudVisible)
            {
                m_OptionsScreen.OpenPage(m_Settings.id, m_Settings.id + "." + CompassSettings.Main, false);
            }
        }

        internal void RemoveHud()
        {
            SetShortcutsEnabled(false);
            if (m_View != null)
            {
                m_View.View?.ExecuteScript("if (window.gtpCompassHud) window.gtpCompassHud.dispose();");
                DetachView();
            }
            Enabled = false;
        }

        private void DetachView()
        {
            if (m_View == null)
            {
                return;
            }
            m_View.Listener.ReadyForBindings -= OnReadyForBindings;
            if (!string.IsNullOrEmpty(m_DialDirectory))
            {
                m_View.uiSystem.RemoveHostLocation(DialHost, m_DialDirectory);
            }
            m_View = null;
        }

        protected override void OnDestroy()
        {
            RemoveHud();
            foreach (var shortcut in m_Shortcuts)
            {
                shortcut.onChanged -= HotkeyChanged;
            }
            base.OnDestroy();
        }

        private readonly struct CameraView
        {
            private readonly IGameCameraController m_Controller;
            private readonly Entity m_Followed;
            private readonly Vector3 m_Pivot;
            private readonly Vector3 m_Rotation;
            private readonly float m_Zoom;

            internal CameraView(IGameCameraController controller)
            {
                m_Controller = controller;
                m_Followed = controller is OrbitCameraController orbit ? orbit.followedEntity : Entity.Null;
                m_Pivot = controller.pivot;
                m_Rotation = controller.rotation;
                m_Zoom = controller.zoom;
            }

            internal bool Matches(IGameCameraController controller) =>
                ReferenceEquals(m_Controller, controller) &&
                (!(controller is OrbitCameraController orbit) || orbit.followedEntity == m_Followed);

            internal void Restore()
            {
                m_Controller.pivot = m_Pivot;
                m_Controller.zoom = m_Zoom;
                m_Controller.rotation = m_Rotation;
            }
        }
    }
}
