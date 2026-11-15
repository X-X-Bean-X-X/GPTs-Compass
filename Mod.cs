using System;
using System.Collections.Generic;
using Colossal;
using Colossal.IO.AssetDatabase;
using Colossal.Localization;
using Colossal.Logging;
using Game;
using Game.Input;
using Game.Modding;
using Game.SceneFlow;
using Game.Settings;

namespace GTPCompass
{
    public sealed class Mod : IMod
    {
        internal const string Id = "GTPCompass";
        internal const string Title = "GTP's Compass by X_Bean_X";
        internal const string Version = "1.0.0";
        internal static readonly ILog Log = LogManager.GetLogger(Id).SetShowsErrorsInUI(false);
        internal static CompassSettings Settings { get; private set; }
        private CompassHudSystem m_Hud;
        private CompassLocale m_Locale;

        public void OnLoad(UpdateSystem updateSystem)
        {
            var defaults = new CompassSettings(this);
            Settings = new CompassSettings(this);
            Settings.RegisterKeyBindings();
            AssetDatabase.global.LoadSettings(Id, Settings, defaults);
            m_Locale = new CompassLocale(Settings);
            GameManager.instance.localizationManager.AddSource("en-US", m_Locale);
            Settings.RegisterInOptionsUI();
            updateSystem.UpdateAt<CompassHudSystem>(SystemUpdatePhase.UIUpdate);
            m_Hud = updateSystem.World.GetExistingSystemManaged<CompassHudSystem>();
            Log.Info(Title + " " + Version + " loaded.");
        }

        public void OnDispose()
        {
            m_Hud?.RemoveHud();
            Settings?.UnregisterInOptionsUI();
            if (m_Locale != null)
            {
                GameManager.instance.localizationManager.RemoveSource("en-US", m_Locale);
            }
            Settings = null;
        }
    }

    public enum CompassOrientation
    {
        CurrentViewUp,
        NorthUp
    }

    public enum CompassPlacement
    {
        Hovering,
        Anchored
    }

    public enum CompassStyle
    {
        Wealthy,
        NauticalChart,
        SurveyorGrid,
        CockpitDisplay,
        MetroTile,
        IndustrialGauge,
        PixelLcd,
        StealthMinimal,
        OrbitalHologram,
        EnamelEmblem
    }

    [FileLocation(Mod.Id)]
    [SettingsUIGroupOrder(General, Shortcuts)]
    [SettingsUIShowGroupName(General, Shortcuts)]
    [SettingsUIKeyboardAction(TurnNorth, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    [SettingsUIGamepadAction(TurnNorth, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    [SettingsUIKeyboardAction(ReturnToPreviousView, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    [SettingsUIGamepadAction(ReturnToPreviousView, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    [SettingsUIKeyboardAction(OpenOptions, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    [SettingsUIGamepadAction(OpenOptions, usages: new[] { Usages.kDefaultUsage, Usages.kToolUsage })]
    public sealed class CompassSettings : ModSetting
    {
        internal const string Main = "Compass";
        internal const string General = "Display";
        internal const string Shortcuts = "Hotkeys";
        internal const string TurnNorth = "TurnNorth";
        internal const string ReturnToPreviousView = "ReturnToPreviousView";
        internal const string OpenOptions = "OpenOptions";
        internal const float DefaultSize = 92f;
        internal const float MinimumSize = 64f;
        internal const float MaximumSize = 240f;

        [SettingsUISection(Main, General)]
        public bool Enabled { get; set; }

        [SettingsUISection(Main, General)]
        public CompassPlacement Placement { get; set; }

        [SettingsUISection(Main, General)]
        public CompassOrientation Orientation { get; set; }

        [SettingsUISection(Main, General)]
        public CompassStyle Style { get; set; }

        [SettingsUIKeyboardBinding(BindingKeyboard.None, TurnNorth)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding TurnNorthBinding { get; set; }

        [SettingsUIGamepadBinding(BindingGamepad.LeftTrigger, TurnNorth, leftStick: true, rightStick: true)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding TurnNorthGamepadBinding { get; set; }

        [SettingsUIKeyboardBinding(BindingKeyboard.None, ReturnToPreviousView)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding ReturnToPreviousViewBinding { get; set; }

        [SettingsUIGamepadBinding(BindingGamepad.RightTrigger, ReturnToPreviousView, leftStick: true, rightStick: true)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding ReturnToPreviousViewGamepadBinding { get; set; }

        [SettingsUIKeyboardBinding(BindingKeyboard.None, OpenOptions)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding OpenOptionsBinding { get; set; }

        [SettingsUIGamepadBinding(BindingGamepad.None, OpenOptions)]
        [SettingsUISection(Main, Shortcuts)]
        public ProxyBinding OpenOptionsGamepadBinding { get; set; }

        [SettingsUIHidden]
        public float PositionX { get; set; }

        [SettingsUIHidden]
        public float PositionY { get; set; }

        [SettingsUIHidden]
        public float Size { get; set; }

        public CompassSettings(IMod mod) : base(mod)
        {
            SetDefaults();
        }

        public override void SetDefaults()
        {
            Enabled = true;
            Placement = CompassPlacement.Hovering;
            Orientation = CompassOrientation.CurrentViewUp;
            Style = CompassStyle.Wealthy;
            PositionX = -1f;
            PositionY = -1f;
            Size = DefaultSize;
            ResetKeyBindings();
        }

        public override void ApplyAndSave()
        {
            Apply();
            CompassSettingsFile.Save(this);
        }
    }

    internal sealed class CompassLocale : IDictionarySource
    {
        private const string OptionsTitle = "GPT's Compass";
        private readonly CompassSettings m_Settings;

        internal CompassLocale(CompassSettings settings)
        {
            m_Settings = settings;
        }

        public IEnumerable<KeyValuePair<string, string>> ReadEntries(
            IList<IDictionaryEntryError> errors, Dictionary<string, int> indexCounts)
        {
            var entries = new Dictionary<string, string>
            {
                [m_Settings.GetSettingsLocaleID()] = OptionsTitle,
                [m_Settings.GetOptionTabLocaleID(CompassSettings.Main)] = "Compass",
                [m_Settings.GetOptionGroupLocaleID(CompassSettings.General)] = "Display",
                [m_Settings.GetOptionGroupLocaleID(CompassSettings.Shortcuts)] = "Hotkeys",
                [m_Settings.GetBindingMapLocaleID()] = OptionsTitle,
                [m_Settings.GetOptionLabelLocaleID(nameof(CompassSettings.Enabled))] = "Enabled",
                [m_Settings.GetOptionDescLocaleID(nameof(CompassSettings.Enabled))] =
                    "Shows the compass and enables its hotkeys. On by default.\nClick the compass for its menu.",
                [m_Settings.GetOptionLabelLocaleID(nameof(CompassSettings.Placement))] = "Compass Placement",
                [m_Settings.GetOptionDescLocaleID(nameof(CompassSettings.Placement))] =
                    "• Hovering Compass floats over the map. Hold Ctrl and drag to move.\n• While hovering, hold Ctrl + Shift to show four handles. Drag any corner to resize.\n• Anchored Compass sits in the lower toolbar. Resizing is disabled.\n• Change placement here or from the compass menu.",
                [m_Settings.GetEnumValueLocaleID(CompassPlacement.Hovering)] = "Hovering Compass",
                [m_Settings.GetEnumValueLocaleID(CompassPlacement.Anchored)] = "Anchored Compass",
                [m_Settings.GetOptionLabelLocaleID(nameof(CompassSettings.Orientation))] = "Compass Orientation",
                [m_Settings.GetOptionDescLocaleID(nameof(CompassSettings.Orientation))] =
                    "• North keeps the north marker fixed.\n• Current Heading keeps the heading marker fixed.\n• Cockpit Display uses the center tick.",
                [m_Settings.GetEnumValueLocaleID(CompassOrientation.CurrentViewUp)] = "Top of Compass is Current Heading",
                [m_Settings.GetEnumValueLocaleID(CompassOrientation.NorthUp)] = "Top of Compass is North",
                [m_Settings.GetOptionLabelLocaleID(nameof(CompassSettings.Style))] = "Compass Style",
                [m_Settings.GetOptionDescLocaleID(nameof(CompassSettings.Style))] =
                    "Choose one of ten compass designs. Wealthy is the default.\nYou can also change the style from the compass menu. Your choice is saved.",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.Wealthy)] = "Wealthy",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.NauticalChart)] = "Nautical Chart",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.SurveyorGrid)] = "Surveyor Grid",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.CockpitDisplay)] = "Cockpit Display",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.MetroTile)] = "Metro Tile",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.IndustrialGauge)] = "Industrial Gauge",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.PixelLcd)] = "Pixel LCD",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.StealthMinimal)] = "Stealth Minimal",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.OrbitalHologram)] = "Orbital Hologram",
                [m_Settings.GetEnumValueLocaleID(CompassStyle.EnamelEmblem)] = "Enamel Emblem"
            };
            AddHotkeys(entries, CompassSettings.TurnNorth, nameof(CompassSettings.TurnNorthBinding),
                nameof(CompassSettings.TurnNorthGamepadBinding), "Turn North",
                "Turn the camera north. Keep its focus, zoom and tilt.", "Default uses both stick clicks + LT.");
            AddHotkeys(entries, CompassSettings.ReturnToPreviousView, nameof(CompassSettings.ReturnToPreviousViewBinding),
                nameof(CompassSettings.ReturnToPreviousViewGamepadBinding), "Return to Previous View",
                "Restore the view saved by Turn North.", "Default uses both stick clicks + RT.");
            AddHotkeys(entries, CompassSettings.OpenOptions, nameof(CompassSettings.OpenOptionsBinding),
                nameof(CompassSettings.OpenOptionsGamepadBinding), "Open Options", "Open this Options page.");
            return entries;
        }

        private void AddHotkeys(Dictionary<string, string> entries, string action, string keyboardProperty,
            string gamepadProperty, string label, string description, string gamepadDefault = "Blank by default.")
        {
            entries[m_Settings.GetOptionLabelLocaleID(keyboardProperty)] = label + " (Keyboard)";
            entries[m_Settings.GetOptionDescLocaleID(keyboardProperty)] = description + "\nBlank by default.";
            entries[m_Settings.GetOptionLabelLocaleID(gamepadProperty)] = label + " (Controller)";
            entries[m_Settings.GetOptionDescLocaleID(gamepadProperty)] = description + "\n" + gamepadDefault;
            entries[m_Settings.GetBindingKeyLocaleID(action)] = label;
        }

        public void Unload() { }
    }
}
