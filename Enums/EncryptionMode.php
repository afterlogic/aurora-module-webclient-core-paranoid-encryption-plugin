<?php

namespace Aurora\Modules\CoreParanoidEncryptionWebclientPlugin\Enums;

class EncryptionMode extends \Aurora\System\Enums\AbstractEnumeration
{
	const Always = 0;
	const AskMe = 1;
	const Never = 2;
	const AlwaysInEncryptedFolder = 3;

	/**
	 * @var array
	 */
	protected $aConsts = array(
		'Always' => self::Always,
		'AskMe' => self::AskMe,
		'Never' => self::Never,
		'AlwaysInEncryptedFolder' => self::AlwaysInEncryptedFolder
	);
}

