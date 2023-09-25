<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CoreParanoidEncryptionWebclientPlugin;

use Aurora\Api;
use Aurora\Modules\Files\Classes\FileItem;
use Aurora\System\Exceptions\ApiException;

/**
 * Paranoid Encryption module allows you to encrypt files in File module using client-based functionality only.
 *
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2023, Afterlogic Corp.
 *
 * @property Settings $oModuleSettings
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractWebclientModule
{
    public static $sStorageType = 'encrypted';
    public static $iStorageOrder = 10;
    public static $sPersonalStorageType = 'personal';
    public static $sSharedStorageType = 'shared';
    public static $sEncryptedFolder = '.encrypted';
    protected $aRequireModules = ['PersonalFiles','S3Filestorage'];

    public function init()
    {
        $this->subscribeEvent('Files::GetStorages::after', [$this, 'onAfterGetStorages'], 1);
        $this->subscribeEvent('Files::FileItemtoResponseArray', [$this, 'onFileItemToResponseArray']);

        $this->subscribeEvent('Files::GetFile', [$this, 'onGetFile']);
        $this->subscribeEvent('Files::CreateFile', [$this, 'onCreateFile']);

        $this->subscribeEvent('Files::GetItems::before', [$this, 'onBeforeGetItems']);
        $this->subscribeEvent('Files::GetItems', [$this, 'onGetItems'], 10001);
        $this->subscribeEvent('Files::Copy::before', [$this, 'onBeforeCopyOrMove']);
        $this->subscribeEvent('Files::Move::before', [$this, 'onBeforeCopyOrMove']);
        $this->subscribeEvent('Files::Delete::before', [$this, 'onBeforeDelete']);

        $this->subscribeEvent('Files::GetFileInfo::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::CreateFolder::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::Rename::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::GetQuota::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::CreateLink::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::GetFileContent::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::IsFileExists::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::CheckQuota::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::CreatePublicLink::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::DeletePublicLink::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('Files::GetPublicFiles::after', [$this, 'onAfterGetPublicFiles']);
        $this->subscribeEvent('Files::SaveFilesAsTempFiles::after', [$this, 'onAfterSaveFilesAsTempFiles']);
        $this->subscribeEvent('Files::UpdateExtendedProps::before', [$this, 'onBeforeMethod']);
        $this->subscribeEvent('OpenPgpFilesWebclient::CreatePublicLink::before', [$this, 'onBeforeMethod']);

        $this->subscribeEvent('SharedFiles::UpdateShare::before', [$this, 'onBeforeUpdateShare']);
        $this->subscribeEvent('SharedFiles::CreateSharedFile', [$this, 'onCreateOrUpdateSharedFile']);
        $this->subscribeEvent('SharedFiles::UpdateSharedFile', [$this, 'onCreateOrUpdateSharedFile']);

        $this->subscribeEvent('Files::GetExtendedProps::before', [$this, 'onBeforeGetExtendedProps']);
    }

    /**
     * @return Module
     */
    public static function getInstance()
    {
        return parent::getInstance();
    }

    /**
     * @return Module
     */
    public static function Decorator()
    {
        return parent::Decorator();
    }

    /**
     * @return Settings
     */
    public function getModuleSettings()
    {
        return $this->oModuleSettings;
    }

    protected function getEncryptedPath($sPath)
    {
        return '/' . self::$sEncryptedFolder . \ltrim($sPath);
    }

    protected function startsWith($haystack, $needle)
    {
        return (substr($haystack, 0, strlen($needle)) === $needle);
    }

    public function onAfterGetStorages($aArgs, &$mResult)
    {
        $oUser = \Aurora\System\Api::getAuthenticatedUser();
        if ($oUser->getExtendedProp($this->GetName() . '::EnableModule')) {
            array_unshift($mResult, [
                'Type' => static::$sStorageType,
                'DisplayName' => $this->i18N('LABEL_STORAGE'),
                'IsExternal' => false,
                'Order' => static::$iStorageOrder,
                'IsDroppable' => false
            ]);
        }
    }

    public function onGetFile($aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);

            $this->GetModuleManager()->broadcastEvent(
                'Files',
                'GetFile',
                $aArgs,
                $mResult
            );
        }
    }

    public function onCreateFile($aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] =  $this->getEncryptedPath($aArgs['Path']);

            $this->GetModuleManager()->broadcastEvent(
                'Files',
                'CreateFile',
                $aArgs,
                $mResult
            );
        }
    }

    /**
     * @ignore
     * @param array $aArgs Arguments of event.
     * @param mixed $mResult Is passed by reference.
     */
    public function onBeforeGetItems(&$aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);

            if (!\Aurora\Modules\Files\Module::Decorator()->IsFileExists($aArgs['UserId'], $aArgs['Type'], '', self::$sEncryptedFolder)) {
                \Aurora\Modules\Files\Module::Decorator()->CreateFolder($aArgs['UserId'], $aArgs['Type'], '', self::$sEncryptedFolder);
            }
        }
    }

    /**
     * @ignore
     * @param array $aArgs Arguments of event.
     * @param mixed $mResult Is passed by reference.
     */
    public function onGetItems(&$aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sPersonalStorageType && $aArgs['Path'] === '' && is_array($mResult)) {
            foreach ($mResult as $iKey => $oFileItem) {
                if ($oFileItem instanceof FileItem && $oFileItem->IsFolder && $oFileItem->Name === self::$sEncryptedFolder) {
                    unset($mResult[$iKey]);
                }
                if ($oFileItem->Shared) {
                    //					\Aurora\Modules\SharedFiles\Models\SharedFile::where();
                }
            }
        }
        //Encrypted files excluded from shared folders
        if (
            $this->oHttp->GetHeader('x-client') !== 'WebClient'
            && $aArgs['Type'] === self::$sPersonalStorageType
            && substr($aArgs['Path'], 1, 11) === self::$sEncryptedFolder
            && is_array($mResult)
        ) {
            foreach ($mResult as $iKey => $oFileItem) {
                if (isset($oFileItem->ExtendedProps) && isset($oFileItem->ExtendedProps['ParanoidKey']) && empty($oFileItem->ExtendedProps['ParanoidKey'])) {
                    unset($mResult[$iKey]);
                }
            }
        }
    }

    /**
     * @ignore
     * @param array $aArgs Arguments of event.
     * @param mixed $mResult Is passed by reference.
     */
    public function onBeforeCopyOrMove(&$aArgs, &$mResult)
    {
        if ($aArgs['FromType'] === self::$sStorageType || $aArgs['ToType'] === self::$sStorageType) {
            if ($aArgs['FromType'] === self::$sStorageType) {
                $aArgs['FromType'] = self::$sPersonalStorageType;
                $aArgs['FromPath'] = $this->getEncryptedPath($aArgs['FromPath']);
            }
            if ($aArgs['ToType'] === self::$sStorageType) {
                $aArgs['ToType'] = self::$sPersonalStorageType;
                $aArgs['ToPath'] = $this->getEncryptedPath($aArgs['ToPath']);
            }

            foreach ($aArgs['Files'] as $iKey => $aItem) {
                if ($aItem['FromType'] === self::$sStorageType) {
                    $aArgs['Files'][$iKey]['FromType'] = self::$sPersonalStorageType;
                    $aArgs['Files'][$iKey]['FromPath'] = $this->getEncryptedPath($aItem['FromPath']);
                }
            }
        }
    }

    /**
     * @ignore
     * @param array $aArgs Arguments of event.
     * @param mixed $mResult Is passed by reference.
     */
    public function onBeforeDelete(&$aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);

            foreach ($aArgs['Items'] as $iKey => $aItem) {
                $aArgs['Items'][$iKey]['Path'] = $this->getEncryptedPath($aItem['Path']);
            }
        }
    }

    /**
     * @ignore
     * @param array $aArgs Arguments of event.
     * @param mixed $mResult Is passed by reference.
     */
    public function onBeforeMethod(&$aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            if (isset($aArgs['Path'])) {
                $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);
            }
        }
    }

    public function onBeforeUpdateShare(&$aArgs, &$mResult)
    {
        if ($aArgs['Storage'] === self::$sStorageType) {
            if ($aArgs['IsDir']) {
                $iErrorCode = 0;
                if (class_exists('\Aurora\Modules\SharedFiles\Enums\ErrorCodes')) {
                    $iErrorCode = \Aurora\Modules\SharedFiles\Enums\ErrorCodes::NotPossibleToShareDirectoryInEcryptedStorage;
                }
                throw new ApiException($iErrorCode);
            }
            $aArgs['Storage'] = self::$sPersonalStorageType;
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);
        }
    }

    public function onCreateOrUpdateSharedFile(&$aArgs, &$mResult)
    {
        if (!empty($aArgs['Share']['ParanoidKeyShared']) && class_exists('\Aurora\Modules\SharedFiles\Models\SharedFile')) {
            $oSharedFile = \Aurora\Modules\SharedFiles\Models\SharedFile::where('owner', $aArgs['UserPrincipalUri'])
                ->where('storage', $aArgs['Storage'])
                ->where('path', $aArgs['FullPath'])
                ->where('principaluri', 'principals/' . $aArgs['Share']['PublicId'])->first();
            $oSharedFile->setExtendedProp('ParanoidKeyShared', $aArgs['Share']['ParanoidKeyShared']);
            $oSharedFile->save();
        }
    }

    /**
     * @param array $aArgs
     * @return void
     */
    public function onFileItemToResponseArray(&$aArgs)
    {
        if (isset($aArgs[0]) && $aArgs[0] instanceof \Aurora\Modules\Files\Classes\FileItem) {
            if ($this->startsWith($aArgs[0]->Path, '/.encrypted')) {
                $aArgs[0]->Path = str_replace('/.encrypted', '', $aArgs[0]->Path);
                $aArgs[0]->FullPath = str_replace('/.encrypted', '', $aArgs[0]->FullPath);
                $aArgs[0]->TypeStr = self::$sStorageType;
            }
        }
    }

    public function onAfterSaveFilesAsTempFiles(&$aArgs, &$mResult)
    {
        $aResult = [];
        foreach ($mResult as $oFileData) {
            foreach ($aArgs['Files'] as $oFileOrigData) {
                if ($oFileOrigData['Name'] === $oFileData['Name']) {
                    if (isset($oFileOrigData['IsEncrypted']) && $oFileOrigData['IsEncrypted']) {
                        $oFileData['Actions'] = [];
                        $oFileData['ThumbnailUrl'] = '';
                    }
                }
            }
            $aResult[] = $oFileData;
        }
        $mResult = $aResult;
    }

    /**
    * @param array $aArgs Arguments of event.
    * @param mixed $mResult Is passed by reference.
    */
    public function onAfterGetPublicFiles(&$aArgs, &$mResult)
    {
        if (is_array($mResult) && isset($mResult['Items']) && is_array($mResult['Items'])) { //remove from result all encrypted files
            $mResult['Items'] = array_filter(
                $mResult['Items'],
                function ($FileItem) {
                    return !isset($FileItem->ExtendedProps)
                        || !isset($FileItem->ExtendedProps['InitializationVector']);
                }
            );
        }
    }

    public function onBeforeGetExtendedProps(&$aArgs, &$mResult)
    {
        if ($aArgs['Type'] === self::$sStorageType) {
            $aArgs['Type'] = self::$sPersonalStorageType;
            $aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);
        }
    }

    /**
     * Obtains list of module settings for authenticated user.
     *
     * @return array
     */
    public function GetSettings()
    {
        \Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::Anonymous);
        $aSettings = null;
        $oUser = \Aurora\System\Api::getAuthenticatedUser();
        if ($oUser && $oUser->isNormalOrTenant()) {
            $aSettings = [
                'EnableModule'			=> $oUser->getExtendedProp(self::GetName() . '::EnableModule'),
                'DontRemindMe'			=> $oUser->getExtendedProp(self::GetName() . '::DontRemindMe'),
                'EnableInPersonalStorage' => $oUser->getExtendedProp(self::GetName() . '::EnableInPersonalStorage'),
                'ChunkSizeMb'			=> $this->oModuleSettings->ChunkSizeMb,
                'AllowMultiChunkUpload'	=> $this->oModuleSettings->AllowMultiChunkUpload,
                'AllowChangeSettings' 	=> $this->oModuleSettings->AllowChangeSettings,
                'EncryptionMode' 		=> 3 //temporary brought back this setting for compatibility with current versions of mobile apps
            ];
        }

        return $aSettings;
    }

    /**
     * Updates settings of the Paranoid Encryption Module.
     *
     * @param boolean $EnableModule indicates if user turned on Paranoid Encryption Module.
     * @param boolean $EnableInPersonalStorage
     * @return boolean
     */
    public function UpdateSettings($EnableModule, $EnableInPersonalStorage)
    {
        \Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

        $iUserId = \Aurora\System\Api::getAuthenticatedUserId();
        if (0 < $iUserId) {
            $oUser = \Aurora\Modules\Core\Module::Decorator()->GetUserWithoutRoleCheck($iUserId);
            $oUser->setExtendedProp(self::GetName() . '::EnableModule', $EnableModule);
            $oUser->setExtendedProp(self::GetName() . '::EnableInPersonalStorage', $EnableInPersonalStorage);
            \Aurora\Modules\Core\Module::Decorator()->UpdateUserObject($oUser);
        }
        return true;
    }

    /**
     * Updates DontRemindMe setting of the Paranoid Encryption Module.
     *
     * @return boolean
     */
    public function DontRemindMe()
    {
        \Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

        $bResult = false;
        $iUserId = \Aurora\System\Api::getAuthenticatedUserId();
        if (0 < $iUserId) {
            $oUser = \Aurora\Modules\Core\Module::Decorator()->GetUserWithoutRoleCheck($iUserId);
            $oUser->setExtendedProp(self::GetName() . '::DontRemindMe', true);
            $bResult = \Aurora\Modules\Core\Module::Decorator()->UpdateUserObject($oUser);
        }

        return $bResult;
    }
}
