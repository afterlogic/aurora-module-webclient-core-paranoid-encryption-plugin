import types from "../../../CoreMobileWebclient/vue-mobile/src/utils/types";

const isUndefined = (mValue) => {
    return 'undefined' === typeof mValue;
}

const fakeMd5 = (iLen) => {
    let sResult = ''
    let sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
    iLen = isUndefined(iLen) ? 32 : types.pInt(iLen);

    while (sResult.length < iLen) {
        sResult += sLine.substr(Math.round(Math.random() * sLine.length), 1);
    }

    return sResult;
}

export const getNewUid = () => {
    return 'jua-uid-' + fakeMd5(16) + '-' + (new Date()).getTime().toString();
}

