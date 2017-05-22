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
	/**
	 * Obtains list of module settings for authenticated user.
	 *
	 * @return array
	 */
	public function GetSettings()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::Anonymous);
		
		return array(
			'EnableModule' => true
		);
	}

	public function init() {
		$this->AddEntries(
				array(
					'stream-mitm' => 'GetMitm',
					'stream-worker' => 'GetWorker'
				)
		);
	}

	public function GetMitm()
	{
		@\header('Content-Type: text/html; charset=utf-8', true);
		$mitm = @file_get_contents($this->GetPath() . '/js/vendors/streamsaver/mitm.html');
		if ($mitm !== false)
		{
			$mitm = str_replace('%HOST%', $_SERVER['SERVER_NAME'], $mitm);
			echo $mitm;
		}
	}

	public function GetWorker()
	{
		@\header('Content-Type: text/javascript; charset=utf-8', true);
		$worker = @file_get_contents($this->GetPath() . '/js/vendors/streamsaver/sw.js');
		if ($worker !== false)
		{
			echo $worker;
		}
	}
}
