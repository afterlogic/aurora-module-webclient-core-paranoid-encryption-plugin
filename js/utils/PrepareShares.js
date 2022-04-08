'use strict';

const
	_ = require('underscore'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

	OpenPgpEncryptor = ModulesManager.run('OpenPgpWebclient', 'getOpenPgpEncryptor'),

	Crypto = require('modules/%ModuleName%/js/CCrypto.js')
;

function getPublicOpenPgpKeys (shares) {
	//get OpenPGP public keys for users who must have access
	const
		sharesEmails = shares.map(oShare => oShare.PublicId),
		publicOpenPgpKeys = sharesEmails.length
			? OpenPgpEncryptor.findKeysByEmails(sharesEmails, /*bIsPublic*/true)
			: []
	;

	if (publicOpenPgpKeys.length < sharesEmails.length) {
		//if not for all users the keys were found - show an error
		const
			emailsFromKeys = publicOpenPgpKeys.map(oKey => oKey.getEmail()),
			diffEmails = sharesEmails.filter(email => !emailsFromKeys.includes(email))
		;
		const errorText = TextUtils.i18n('%MODULENAME%/ERROR_NO_PUBLIC_KEYS_FOR_USERS_PLURAL',
			{'USERS': diffEmails.join(', ')}, null, diffEmails.length);
		Screens.showError(errorText);
		return false;
	}

	return publicOpenPgpKeys;
}

async function getDecryptedParanoidKey(encryptedParanoidKey) {
	const privateKey = await OpenPgpEncryptor.getCurrentUserPrivateKey();
	if (!privateKey) {
		return false;
	}

	//get a password for decryption and signature operations
	const password = await OpenPgpEncryptor.askForKeyPassword(privateKey.getUser());
	if (!password) {
		//user canceled operation
		return false;
	}

	//decrypt personal paranoid key
	const decryptedParanoidKey = await Crypto.decryptParanoidKey(
		encryptedParanoidKey,
		password
	);

	return { decryptedParanoidKey, password };
}

async function onBeforeUpdateShare (params) {
	if (!_.isFunction(params.OnSuccessCallback) || !_.isFunction(params.OnErrorCallback)) {
		// Cannot return result
		return;
	}

	const
		fileItem = params.FileItem,
		extendedProps = fileItem && fileItem.oExtendedProps,
		encryptedParanoidKey = extendedProps &&
			(fileItem.sharedWithMe() ? extendedProps.ParanoidKeyShared : extendedProps.ParanoidKey)
	;

	if (!fileItem || !fileItem.IS_FILE || !encryptedParanoidKey || !_.isArray(params.Shares)) {
		// The item is not a file or not encrypted
		params.OnSuccessCallback();
		return;
	}

	const newShares = params.Shares.filter(share => share.New);
	if (newShares.length === 0) {
		// There are no new shares so no need to encrypt the key
		params.OnSuccessCallback();
		return;
	}

	// Get OpenPGP public keys for users who must have access
	const publicOpenPgpKeys = getPublicOpenPgpKeys(newShares);
	if (!publicOpenPgpKeys) {
		params.OnErrorCallback();
		return;
	}

	// Decrypt paranoid key with user private OpenPGP key
	const { decryptedParanoidKey, password } = await getDecryptedParanoidKey(encryptedParanoidKey);
	if (!decryptedParanoidKey) {
		params.OnErrorCallback();
		return;
	}

	// Encrypt paranoid key with public OpenPGP keys
	for (const share of params.Shares) {
		const publicOpenPgpKey = publicOpenPgpKeys.find(openPgpKey => openPgpKey.emailParts.email === share.PublicId);
		if (publicOpenPgpKey) {
			const encryptedParanoidKeyShared = await Crypto.encryptParanoidKey(
				decryptedParanoidKey,
				[publicOpenPgpKey],
				password
			);
			if (encryptedParanoidKeyShared) {
				share.ParanoidKeyShared = encryptedParanoidKeyShared;
			}
			delete share.New;
		}
	}

	//continue sharing
	params.OnSuccessCallback();
}

module.exports = {
	onBeforeUpdateShare
};
