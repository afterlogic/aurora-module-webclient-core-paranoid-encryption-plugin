<?php
/**
 * @copyright Copyright (c) 2017, Afterlogic Corp.
 * @license AGPL-3.0 or AfterLogic Software License
 *
 * This code is licensed under AGPLv3 license or AfterLogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CoreJscryptoWebclientPlugin;

/**
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractWebclientModule
{

	public function init()
	{
		$this->extendObject('CUser', array(
				'EnableModule' => array('bool', true)
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
		if (!empty($oUser) && $oUser->Role === \EUserRole::NormalUser)
		{
			return array(
				'EnableModule' => $oUser->{$this->GetName().'::EnableModule'}
			);
		}

		return null;
	}

	/**
	 * Updates settings of the Jscrypto Module.
	 *
	 * @param boolean $EnableModule indicates if user turned on Jscrypto Module.
	 * @return boolean
	 */
	public function UpdateSettings($EnableModule)
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\EUserRole::NormalUser);

		$iUserId = \Aurora\System\Api::getAuthenticatedUserId();
		if (0 < $iUserId)
		{
			$oCoreDecorator = \Aurora\System\Api::GetModuleDecorator('Core');
			$oUser = $oCoreDecorator->GetUser($iUserId);
			$oUser->{$this->GetName().'::EnableModule'} = $EnableModule;
			$oCoreDecorator->UpdateUserObject($oUser);
		}
		return true;
	}
}
