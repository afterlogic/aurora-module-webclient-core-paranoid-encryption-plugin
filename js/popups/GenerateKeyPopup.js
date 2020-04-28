'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CGenerateKeyPopup()
{
	CAbstractPopup.call(this);

	this.keyName = ko.observable(App.getUserPublicId());
	this.fOnGenerateCallback = null;
}

_.extendOwn(CGenerateKeyPopup.prototype, CAbstractPopup.prototype);

CGenerateKeyPopup.prototype.PopupTemplate = '%ModuleName%_GenerateKeyPopup';

CGenerateKeyPopup.prototype.onOpen = function (fOnGenerateCallback)
{
	this.fOnGenerateCallback = fOnGenerateCallback;
};

CGenerateKeyPopup.prototype.generateKey = function ()
{
	JscryptoKey.generateAndExportKey(_.bind(function() {
			this.fOnGenerateCallback();
		}, this),
		this.keyName()
	);
	this.closePopup();
};

module.exports = new CGenerateKeyPopup();
