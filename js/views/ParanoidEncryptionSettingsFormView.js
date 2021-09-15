'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	CAbstractSettingsFormView = ModulesManager.run('SettingsWebclient', 'getAbstractSettingsFormViewClass'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	ImportKeyStringPopup = require('modules/%ModuleName%/js/popups/ImportKeyStringPopup.js'),
	GenerateKeyPopup = require('modules/%ModuleName%/js/popups/GenerateKeyPopup.js'),
	ExportInformationPopup = require('modules/%ModuleName%/js/popups/ExportInformationPopup.js'),
	DeleteKeyPopup = require('modules/%ModuleName%/js/popups/DeleteKeyPopup.js'),
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js'),
	OpenPgpEncryptor = ModulesManager.run('OpenPgpWebclient', 'getOpenPgpEncryptor')
;

/**
 * @constructor
 */
function CParanoidEncryptionSettingsFormView()
{
	CAbstractSettingsFormView.call(this, Settings.ServerModuleName);

	this.enableJscrypto = ko.observable(Settings.enableJscrypto());
	this.enableInPersonalStorage = ko.observable(Settings.EnableInPersonalStorage);
	this.keyName = ko.observable('');
	this.bIsHttpsEnable = window.location.protocol === "https:";
	this.allowChangeSettings = ko.observable(Settings.AllowChangeSettings);
	this.isImporting = ko.observable(false);
	this.exportKeyBound = _.bind(this.exportKey, this);
	this.isPGPKeysAvailable = ko.observable(true);

	if (ko.isObservable(JscryptoKey.keyName))
	{
		JscryptoKey.keyName.subscribe(function () {
			this.keyName(JscryptoKey.keyName());
		}, this);
	}
	
	this.allowKeysManagement = ko.observable(!!this.keyName());
	this.keyName.subscribe(function () {
		if (!!this.keyName())
		{
			this.allowKeysManagement(true);
		}
	}, this);
}

_.extendOwn(CParanoidEncryptionSettingsFormView.prototype, CAbstractSettingsFormView.prototype);

CParanoidEncryptionSettingsFormView.prototype.ViewTemplate = '%ModuleName%_ParanoidEncryptionSettingsFormView';

CParanoidEncryptionSettingsFormView.prototype.enableBackwardCompatibility = function ()
{
	this.allowKeysManagement(true);
};

CParanoidEncryptionSettingsFormView.prototype.importFileKey = function ()
{
	$("#import-key-file").click();
};

CParanoidEncryptionSettingsFormView.prototype.importStringKey = function ()
{
	Popups.showPopup(ImportKeyStringPopup);
};

CParanoidEncryptionSettingsFormView.prototype.readKeyFromFile = function ()
{
	var
		input = document.getElementById('import-key-file'),
		file = input.files[0],
		reader = new FileReader(),
		sContents = '',
		aFileNameParts = input.files[0].name.split('.'),
		sKeyName = '',
		fOnGenerateCallback = _.bind(function() {
			this.isImporting(false);
		}, this),
		fOnErrorCallback = _.bind(function() {
			this.isImporting(false);
		}, this)
	;
	aFileNameParts.splice(aFileNameParts.length - 1, 1);
	sKeyName = aFileNameParts.join('');
	if (!file)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
		return;
	}
	this.isImporting(true);
	reader.onload = function(e) {
		sContents = e.target.result;
		JscryptoKey.importKeyFromString(sKeyName, sContents, fOnGenerateCallback, fOnErrorCallback);
	};

	try
	{
		reader.readAsText(file);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
	}
};

CParanoidEncryptionSettingsFormView.prototype.generateNewKey = function ()
{
	Popups.showPopup(GenerateKeyPopup, [_.bind(function () {
		//After generating new key show "export key" dialog
		Popups.showPopup(ExportInformationPopup, [this.exportKeyBound, this.keyName()]);
	}, this)]);
};

CParanoidEncryptionSettingsFormView.prototype.removeJscryptoKey = function ()
{
	var
		fRemove = _.bind(function (bRemove) {
			if (bRemove)
			{
				var oResult = JscryptoKey.deleteKey();
				if (oResult.error)
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_DELETE_KEY'));
				}
			}
		}, this)
	;

	Popups.showPopup(DeleteKeyPopup, [this.exportKeyBound, this.keyName(), fRemove]);
};

CParanoidEncryptionSettingsFormView.prototype.getCurrentValues = function ()
{
	return [
		this.enableJscrypto(),
		this.enableInPersonalStorage()
	];
};

CParanoidEncryptionSettingsFormView.prototype.revertGlobalValues = function ()
{
	this.enableJscrypto(Settings.enableJscrypto());
	this.enableInPersonalStorage(Settings.EnableInPersonalStorage);
};

CParanoidEncryptionSettingsFormView.prototype.getParametersForSave = function ()
{
	return {
		'EnableModule': this.enableJscrypto(),
		'EnableInPersonalStorage': this.enableInPersonalStorage()
	};
};

CParanoidEncryptionSettingsFormView.prototype.applySavedValues = function ()
{
	Settings.update(this.enableJscrypto(), this.enableInPersonalStorage());
};

CParanoidEncryptionSettingsFormView.prototype.onShow = async function ()
{
	JscryptoKey.loadKeyNameFromStorage();
	let bIsPrivateKeyAvailable = await OpenPgpEncryptor.isPrivateKeyAvailable();
	this.isPGPKeysAvailable(bIsPrivateKeyAvailable);
	this.allowKeysManagement(!!this.keyName());
};

CParanoidEncryptionSettingsFormView.prototype.exportKey= function ()
{
	var
		oBlob = null,
		downloadLinkHref = null,
		oDownloadLink = document.createElement("a")
	;

	JscryptoKey.getKey(
		/*fOnGenerateKeyCallback*/_.bind(function(oKey) {
			if (oKey)
			{
				JscryptoKey.exportKey()
					.then(_.bind(function(keydata) {
						oBlob = new Blob([HexUtils.Array2HexString(new Uint8Array(keydata))], {type: 'text/plain'});
						downloadLinkHref = window.URL.createObjectURL(oBlob);
						document.body.appendChild(oDownloadLink);
						oDownloadLink.style = "display: none";
						oDownloadLink.href = downloadLinkHref;
						oDownloadLink.download = this.keyName();
						oDownloadLink.click();
						window.URL.revokeObjectURL(downloadLinkHref);
					}, this))
					.catch(function() {
						Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
					});
			}
			else
			{
				Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
			}
		}, this),
		/*fOnErrorCallback*/		false,
		/*sPassword*/			false,
		/*bForcedKeyLoading*/	true
	);
};

module.exports = new CParanoidEncryptionSettingsFormView();
