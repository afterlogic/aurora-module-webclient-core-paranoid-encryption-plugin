<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CoreParanoidEncryptionWebclientPlugin;

/**
 * Paranoid Encryption module allows you to encrypt files in File module using client-based functionality only.
 *
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2019, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractWebclientModule
{
	static $sStorageType = 'encrypted';
	static $iStorageOrder = 10;
	static $sPersonalStorageType = 'personal';
	static $sSharedStorageType = 'shared';
	static $sEncryptedFolder = '.encrypted';
	protected $aRequireModules = ['PersonalFiles','S3Filestorage'];

	public function init()
	{
		\Aurora\Modules\Core\Classes\User::extend(
			self::GetName(),
			[
				'EnableModule' 			=> ['bool', $this->getConfig('EnabledByDefault', false)],
				'EncryptionMode' 		=> ['int', $this->getConfig('EncryptionModeByDefault', Enums\EncryptionMode::AskMe)],
				'AllowChangeSettings'	=> ['bool', $this->getConfig('AllowChangeSettings', true)],
				'DontRemindMe'			=> ['bool', false],
			]
		);

		$this->subscribeEvent('Files::GetStorages::after', [$this, 'onAfterGetStorages'], 1);
		$this->subscribeEvent('Files::FileItemtoResponseArray', [$this, 'onFileItemToResponseArray']);

		$this->subscribeEvent('Files::GetFile', [$this, 'onGetFile']);
		$this->subscribeEvent('Files::CreateFile', [$this, 'onCreateFile']);

		$this->subscribeEvent('Files::GetItems::before', [$this, 'onBeforeGetItems']);
		$this->subscribeEvent('Files::GetItems::after', [$this, 'onAfterGetItems'], 10001);
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
		$this->subscribeEvent('Files::UpdateExtendedProps::before', [$this, 'onBeforeMethod']);
		$this->subscribeEvent('OpenPgpFilesWebclient::CreatePublicLink::before', [$this, 'onBeforeMethod']);
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
		if ($oUser->{$this->GetName() . '::EnableModule'} && $this->getEncryptionMode() === Enums\EncryptionMode::AlwaysInEncryptedFolder)
		{
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
		if ($aArgs['Type'] === self::$sStorageType)
		{
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
		if ($aArgs['Type'] === self::$sStorageType)
		{
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
		if ($aArgs['Type'] === self::$sStorageType)
		{
			$aArgs['Type'] = self::$sPersonalStorageType;
			$aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);

			if(!\Aurora\Modules\Files\Module::Decorator()->IsFileExists($aArgs['UserId'], $aArgs['Type'], '', self::$sEncryptedFolder))
			{
				\Aurora\Modules\Files\Module::Decorator()->CreateFolder($aArgs['UserId'], $aArgs['Type'], '', self::$sEncryptedFolder);
			}
		}
	}

	/**
	 * @ignore
	 * @param array $aArgs Arguments of event.
	 * @param mixed $mResult Is passed by reference.
	 */
	public function onAfterGetItems(&$aArgs, &$mResult)
	{
		if ($this->getEncryptionMode() === Enums\EncryptionMode::AlwaysInEncryptedFolder)
		{
			if ($aArgs['Type'] === self::$sPersonalStorageType && $aArgs['Path'] === '' && is_array($mResult))
			{
				foreach ($mResult as $iKey => $oFileItem)
				{
					if ($oFileItem instanceof \Aurora\Modules\Files\Classes\FileItem && $oFileItem->IsFolder && $oFileItem->Name === self::$sEncryptedFolder)
					{
						unset($mResult[$iKey]);
					}
				}
			}
		}
		//Encrypted files excluded from shared folders
		if (
			$aArgs['Type'] === self::$sSharedStorageType
			&& is_array($mResult)
			&& $aArgs['Path'] !== ''
		)
		{
			foreach ($mResult as $iKey => $oFileItem)
			{
				if (
					isset($oFileItem->ExtendedProps)
					&& isset($oFileItem->ExtendedProps['InitializationVector'])
				)
				{
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
		if ($aArgs['FromType'] === self::$sStorageType || $aArgs['ToType'] === self::$sStorageType)
		{
			if ($aArgs['FromType'] === self::$sStorageType)
			{
				$aArgs['FromType'] = self::$sPersonalStorageType;
				$aArgs['FromPath'] = $this->getEncryptedPath($aArgs['FromPath']);
			}
			if ($aArgs['ToType'] === self::$sStorageType)
			{
				$aArgs['ToType'] = self::$sPersonalStorageType;
				$aArgs['ToPath'] = $this->getEncryptedPath($aArgs['ToPath']);
			}

			foreach ($aArgs['Files'] as $iKey => $aItem)
			{
				if ($aItem['FromType'] === self::$sStorageType)
				{
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
		if ($aArgs['Type'] === self::$sStorageType)
		{
			$aArgs['Type'] = self::$sPersonalStorageType;
			$aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);

			foreach ($aArgs['Items'] as $iKey => $aItem)
			{
				$aArgs['Items'][$iKey]['Path'] = $this->getEncryptedPath($aItem['Path']);
			}
		}
	}

	/**
	 * @ignore
	 * @param array $aArgs Arguments of event.
	 * @param mixed $mResult Is passed by reference.
	 */
	public function onBeforeMethod	(&$aArgs, &$mResult)
	{
		if ($aArgs['Type'] === self::$sStorageType)
		{
			$aArgs['Type'] = self::$sPersonalStorageType;
			if (isset($aArgs['Path']))
			{
				$aArgs['Path'] = $this->getEncryptedPath($aArgs['Path']);
			}
		}
	}

	/**
	 * @param [type] $aArgs
	 * @return void
	 */
	public function onFileItemToResponseArray(&$aArgs)
	{
		if (isset($aArgs[0]) && $aArgs[0] instanceof \Aurora\Modules\Files\Classes\FileItem)
		{
			if ($this->startsWith($aArgs[0]->Path, '/.encrypted'))
			{
				$aArgs[0]->Path = str_replace('/.encrypted', '', $aArgs[0]->Path);
				$aArgs[0]->FullPath = str_replace('/.encrypted', '', $aArgs[0]->FullPath);
				$aArgs[0]->TypeStr = self::$sStorageType;
			}
		}
	}

	/**
	* @param array $aArgs Arguments of event.
	* @param mixed $mResult Is passed by reference.
	*/
   public function onAfterGetPublicFiles(&$aArgs, &$mResult)
   {
		if (is_array($mResult) && isset($mResult['Items']) && is_array($mResult['Items']))
		{ //remove from result all encrypted files
			$mResult['Items'] = array_filter(
				$mResult['Items'],
				function ($FileItem) {
					return !isset($FileItem->ExtendedProps)
						|| !isset($FileItem->ExtendedProps['InitializationVector']);
				}
			);
		}
   }

	protected function getEncryptionMode()
	{
		$mResult = false;
		if ($this->getConfig('AllowChangeSettings', true))
		{
			$oUser = \Aurora\System\Api::getAuthenticatedUser();
			if ($oUser instanceof \Aurora\Modules\Core\Classes\User)
			{
				$mResult = $oUser->{self::GetName().'::EncryptionMode'};
			}
		}
		else
		{
			$mResult = $this->getConfig('EncryptionModeByDefault', Enums\EncryptionMode::AskMe);
		}

		return $mResult;
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
		if (!empty($oUser) && $oUser->isNormalOrTenant())
		{
			$aSettings = [
				'EnableModule'			=> $oUser->{self::GetName().'::EnableModule'},
				'DontRemindMe'			=> $oUser->{self::GetName().'::DontRemindMe'},
				'ChunkSizeMb'			=> $this->getConfig('ChunkSizeMb', 5),
				'AllowMultiChunkUpload'	=> $this->getConfig('AllowMultiChunkUpload', true),
				'AllowChangeSettings' 	=> $this->getConfig('AllowChangeSettings', true),
				'EncryptionMode' 		=> $this->getEncryptionMode()
			];
		}

		return $aSettings;
	}

	/**
	 * Updates settings of the Paranoid Encryption Module.
	 *
	 * @param boolean $EnableModule indicates if user turned on Paranoid Encryption Module.
	 * @return boolean
	 */
	public function UpdateSettings($EnableModule, $EncryptionMode)
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

		$iUserId = \Aurora\System\Api::getAuthenticatedUserId();
		if (0 < $iUserId)
		{
			$oUser = \Aurora\Modules\Core\Module::Decorator()->GetUserUnchecked($iUserId);
			$oUser->{self::GetName().'::EnableModule'} = $EnableModule;
			$oUser->{self::GetName().'::EncryptionMode'} = $EncryptionMode;
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
		if (0 < $iUserId)
		{
			$oUser = \Aurora\Modules\Core\Module::Decorator()->GetUserUnchecked($iUserId);
			$oUser->{self::GetName().'::DontRemindMe'} = true;
			$bResult = \Aurora\Modules\Core\Module::Decorator()->UpdateUserObject($oUser);
		}

		return $bResult;
	}
}
