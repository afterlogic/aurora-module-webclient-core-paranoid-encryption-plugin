'use strict';

var
	_ = require('underscore'),
	HexUtils = {}
;

HexUtils.Array2HexString = function (aInput)
{
	var sHexAB = '';
	_.each(aInput, function(element) {
		var sHex = element.toString(16);
		sHexAB += ((sHex.length === 1) ? '0' : '') + sHex;
	})
	return sHexAB;
};

HexUtils.HexString2Array = function (sHex)
{
	var aResult = [];
	if (sHex.length === 0 || sHex.length % 2 !== 0)
	{
		return aResult;
	}
	for (var i = 0; i < sHex.length; i+=2)
	{
		aResult.push(parseInt(sHex.substr(i, 2), 16));
	}
	return aResult;
};

module.exports = HexUtils;