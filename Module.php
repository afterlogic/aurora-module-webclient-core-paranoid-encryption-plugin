<?php
/**
 * @copyright Copyright (c) 2017, Afterlogic Corp.
 * @license AGPL-3.0 or AfterLogic Software License
 *
 * This code is licensed under AGPLv3 license or AfterLogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CoreParanoidEncryptionWebclientPlugin;

/**
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractWebclientModule
{

	public function init()
	{
		$this->extendObject(
			'Aurora\Modules\Core\Classes\User', 
			array(
				'EnableModule' => array('bool', $this->getConfig('EnabledByDefault', false)),
				'EncryptionMode' => array('int', 1)
			)
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
			return array(
				'EnableModule' => $oUser->{$this->GetName().'::EnableModule'},
				'EncryptionMode' => $oUser->{$this->GetName().'::EncryptionMode'}
			);
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
			$oUser->{$this->GetName().'::EnableModule'} = $EnableModule;
			$oUser->{$this->GetName().'::EncryptionMode'} = $EncryptionMode;
			$oCoreDecorator->UpdateUserObject($oUser);
		}
		return true;
	}
}
