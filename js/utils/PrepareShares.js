'use strict';

const
	_ = require('underscore'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

	OpenPgpEncryptor = ModulesManager.run('OpenPgpWebclient', 'getOpenPgpEncryptor'),

	Crypto = require('modules/%ModuleName%/js/CCrypto.js')
;

async function getPublicOpenPgpKeys (shares) {
	//get OpenPGP public keys for users who should have access
	const
		contactUUIDs = shares.map(share => share.ContactUUID).filter(uuid => uuid),
		emails = shares.map(oShare => oShare.PublicId)
	;
	let allPublicKeys = await OpenPgpEncryptor.getPublicKeysByContactsAndEmails(contactUUIDs, emails);
	if (allPublicKeys.length < emails.length) {
		//if not for all users the keys were found - show an error
		const
			emailsFromKeys = allPublicKeys.map(key => key.getEmail()),
			diffEmails = emails.filter(email => !emailsFromKeys.includes(email)),
			errorText = TextUtils.i18n('%MODULENAME%/ERROR_NO_PUBLIC_KEYS_FOR_USERS_PLURAL',
				{'USERS': diffEmails.join(', ')}, null, diffEmails.length
			)
		;
		Screens.showError(errorText);
		allPublicKeys = false;
	}
	return allPublicKeys;
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
	const publicOpenPgpKeys = await getPublicOpenPgpKeys(newShares);
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
