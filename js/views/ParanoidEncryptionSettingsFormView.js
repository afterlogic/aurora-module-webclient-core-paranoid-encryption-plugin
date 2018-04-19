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
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js')
;

/**
 * @constructor
 */
function CParanoidEncryptionSettingsFormView()
{
	CAbstractSettingsFormView.call(this, Settings.ServerModuleName);

	this.enableJscrypto = ko.observable(Settings.EnableJscrypto());
	this.key = ko.observable('');
	this.keyName = ko.observable('');
	this.downloadLinkHref = ko.observable('#');
	this.bIsHttpsEnable = window.location.protocol === "https:";
	this.encryptionMode = ko.observable(Settings.EncryptionMode());
	this.isImporting = ko.observable(false);

	if (ko.isObservable(JscryptoKey.key))
	{
		JscryptoKey.key.subscribe(function () {
			this.key(JscryptoKey.key());
			this.keyName(JscryptoKey.keyName());
		}, this);
	}
}

_.extendOwn(CParanoidEncryptionSettingsFormView.prototype, CAbstractSettingsFormView.prototype);

CParanoidEncryptionSettingsFormView.prototype.ViewTemplate = '%ModuleName%_ParanoidEncryptionSettingsFormView';

CParanoidEncryptionSettingsFormView.prototype.setExportUrl =	function (bShowDialog)
{
	var
		sHref = '#',
		oBlob = null
	;

	this.downloadLinkHref(sHref);
	if (window.Blob && window.URL && _.isFunction(window.URL.createObjectURL))
	{
		if (this.key())
		{
			JscryptoKey.exportKey()
				.then(_.bind(function(keydata) {
					oBlob = new Blob([HexUtils.Array2HexString(new Uint8Array(keydata))], {type: 'text/plain'});
					sHref = window.URL.createObjectURL(oBlob);
					this.downloadLinkHref(sHref);
					if (bShowDialog)
					{
						Popups.showPopup(ExportInformationPopup, [sHref, this.keyName()]);
					}
				}, this));
		}
	}
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
		JscryptoKey.importKeyFromString(sKeyName, sContents, fOnGenerateCallback);
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
			this.setExportUrl(/*bShowDialog*/ true);
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

	Popups.showPopup(DeleteKeyPopup, [this.downloadLinkHref(), this.keyName(), fRemove]);
};

CParanoidEncryptionSettingsFormView.prototype.getCurrentValues = function ()
{
	return [
		this.enableJscrypto(),
		this.encryptionMode()
	];
};

CParanoidEncryptionSettingsFormView.prototype.revertGlobalValues = function ()
{
	this.enableJscrypto(Settings.EnableJscrypto());
	this.encryptionMode(Settings.EncryptionMode());
};

CParanoidEncryptionSettingsFormView.prototype.getParametersForSave = function ()
{
	return {
		'EnableModule': this.enableJscrypto(),
		'EncryptionMode': Types.pInt(this.encryptionMode())
	};
};

CParanoidEncryptionSettingsFormView.prototype.applySavedValues = function ()
{
	Settings.update(this.enableJscrypto(), this.encryptionMode());
};

CParanoidEncryptionSettingsFormView.prototype.onShow = function ()
{
	JscryptoKey.getKey(_.bind(function(oKey) {
		this.key(oKey);
		this.setExportUrl();
	}, this));
};

module.exports = new CParanoidEncryptionSettingsFormView();
