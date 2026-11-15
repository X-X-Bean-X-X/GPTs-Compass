using System;
using System.IO;
using Colossal.Json;
using UnityEngine;

namespace GTPCompass
{
    internal static class CompassSettingsFile
    {
        internal static void Save(object settings)
        {
            string path = Path.Combine(Application.persistentDataPath, Mod.Id + ".coc");
            string temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                // Use the game's settings format and replace only this mod's file after a complete write.
                File.WriteAllText(temporary, Mod.Id + Environment.NewLine + JSON.Dump(settings) + Environment.NewLine);
                if (File.Exists(path))
                {
                    File.Replace(temporary, path, null);
                }
                else
                {
                    File.Move(temporary, path);
                }
            }
            catch (Exception error) when (error is IOException || error is UnauthorizedAccessException)
            {
                Mod.Log.Warn("Could not save Compass settings: " + error.Message);
            }
            finally
            {
                try
                {
                    File.Delete(temporary);
                }
                catch (Exception error) when (error is IOException || error is UnauthorizedAccessException)
                {
                    Mod.Log.Warn("Could not remove the Compass settings temporary file: " + error.Message);
                }
            }
        }
    }
}
