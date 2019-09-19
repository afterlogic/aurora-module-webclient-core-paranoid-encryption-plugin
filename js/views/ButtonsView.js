'use strict';

var
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js')
;

/**
 * @constructor
 */
function ButtonsView()
{
	this.storageType = null;
}

ButtonsView.prototype.useFilesViewData = function (oFilesView)
{
	this.storageType = oFilesView.storageType;
	oFilesView.pathItems.subscribe(function () {
		if (this.isEncryptedStorage())
		{
			oFilesView.disableButton(oFilesView.shortcutButtonModules, '%ModuleName%');
		}
		else
		{
			oFilesView.enableButton(oFilesView.shortcutButtonModules, '%ModuleName%');
		}
	}, this);
};

ButtonsView.prototype.isEncryptedStorage = function ()
{
	return this.storageType() === 'encrypted';
};

module.exports = new ButtonsView();
