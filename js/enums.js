'use strict';

var
	_ = require('underscore'),
	Enums = {}
;

/**
 * @enum {number}
 */
Enums.EncryptionMode = {
	Always: 0,
	AskMe: 1,
	Never: 2,
	AlwaysInEncryptedFolder: 3
};

if (typeof window.Enums === 'undefined')
{
	window.Enums = {};
}

_.extendOwn(window.Enums, Enums);
