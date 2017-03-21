<?php

namespace Aurora\Modules\CoreJscryptoWebclientPlugin;

class Module extends \Aurora\System\Module\AbstractWebclientModule
{
	/**
	 * Obtains list of module settings for authenticated user.
	 *
	 * @return array
	 */
	public function GetSettings()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\EUserRole::Anonymous);
		
		return array(
			'EnableModule' => true
		);
	}
}
