<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CoreParanoidEncryptionWebclientPlugin;

use Aurora\System\SettingsProperty;

/**
 * @property bool $Disabled
 * @property bool $AvailableFor
 * @property bool $EnabledByDefault
 * @property bool $EnableInPersonalStorageByDefault
 * @property int $ChunkSizeMb
 * @property bool $AllowMultiChunkUpload
 * @property bool $AllowChangeSettings
 */

class Settings extends \Aurora\System\Module\Settings
{
    protected function initDefaults()
    {
        $this->aContainer = [
            "Disabled" => new SettingsProperty(
                false,
                "bool",
                null,
                "Setting to true disables the module",
            ),
            "AvailableFor" => new SettingsProperty(
                [
                    "FilesWebclient"
                ],
                "array",
                null,
                "Automatically provide this feature if one of the listed modules is requested by the entry point",
            ),
            "EnabledByDefault" => new SettingsProperty(
                false,
                "bool",
                null,
                "If true, the feature is enabled for new users",
            ),
            "EnableInPersonalStorageByDefault" => new SettingsProperty(
                false,
                "bool",
                null,
                "If true, the feature is enabled for new users in personal storage by default",
            ),
            "ChunkSizeMb" => new SettingsProperty(
                5,
                "int",
                null,
                "Sets a chunk size used for encrypting files, in Mbytes",
            ),
            "AllowMultiChunkUpload" => new SettingsProperty(
                true,
                "bool",
                null,
                "Defines whether the files can be uploaded in chunks or in full",
            ),
            "AllowChangeSettings" => new SettingsProperty(
                true,
                "bool",
                null,
                "",
            ),
        ];
    }
}
