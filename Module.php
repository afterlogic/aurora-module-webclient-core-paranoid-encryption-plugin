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

	public function init()
	{
		\Aurora\Modules\Core\Classes\User::extend(
			self::GetName(), 
			[
				'EnableModule' => array('bool', $this->getConfig('EnabledByDefault', false)),
				'EncryptionMode' => array('int', 1)
			]
		);
	}

	/**
	 * Obtains list of module settings for authenticated user.
	 *
	 * @return array
	 */
	public function GetSettings()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::Anonymous);

		$oUser = \Aurora\System\Api::getAuthenticatedUser();
		if (!empty($oUser) && $oUser->Role === \Aurora\System\Enums\UserRole::NormalUser)
		{
			return [
				'EnableModule'			=> $oUser->{self::GetName().'::EnableModule'},
				'EncryptionMode'		=> $oUser->{self::GetName().'::EncryptionMode'},
				'ChunkSizeMb'			=> $this->getConfig('ChunkSizeMb', 5),
				'AllowMultiChunkUpload'	=> $this->getConfig('AllowMultiChunkUpload', true)
			];
		}

		return null;
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
			$oCoreDecorator = \Aurora\Modules\Core\Module::Decorator();
			$oUser = $oCoreDecorator->GetUser($iUserId);
			$oUser->{self::GetName().'::EnableModule'} = $EnableModule;
			$oUser->{self::GetName().'::EncryptionMode'} = $EncryptionMode;
			$oCoreDecorator->UpdateUserObject($oUser);
		}
		return true;
	}
}
