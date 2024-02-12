import notification from "src/utils/notification";
import OpenPgp from "../../../OpenPgpMobileWebclient/vue-mobile/openpgp-helper";
// import store from "src/store";
import Crypto from "../crypto/CCrypto";
import _ from 'lodash'

import { useCoreStore, useFilesStore } from 'src/stores/index-all'

const filesStore = useFilesStore()
const coreStore = useCoreStore()

let principalsEmails = []
let file = null
let onContinueAction = null

export const init = ({contacts, currentFile, onContinueSaving}) => {
    principalsEmails = contacts
    file = currentFile
    onContinueAction = onContinueSaving
}

export const updateExtendedProps = (passPassphrase) => {
    // const currentAccountEmail = store.getters['core/userPublicId']
    const currentAccountEmail = coreStore.userPublicId
    const privateKey = OpenPgp.getPrivateKeyByEmail(currentAccountEmail)
    const publicKey = OpenPgp.getPublicKeyByEmail(currentAccountEmail)

    Crypto.getEncryptedKey(file, privateKey, publicKey, currentAccountEmail, passPassphrase, null, false, principalsEmails)
        .then( async encryptKey => {
            if (encryptKey?.sError) {
                notification.showError(encryptKey.sError)
                return null
            } else if (encryptKey) {
                const parameters = {
                    // type: store.getters['filesmobile/currentStorage'].Type,
                    // path: store.getters['filesmobile/currentPath'],
                    type: filesStore.currentStorage?.Type,
                    path: filesStore.currentPath,
                    name: file.name,
                    paranoidKey: {
                        value: encryptKey.data,
                        key: 'ParanoidKeyShared'
                    },
                }
                // const result = await store.dispatch('filesmobile/asyncUpdateExtendedProps', parameters)
                const result = await filesStore.asyncUpdateExtendedProps(parameters)
                if (result) {
                    if (_.isFunction(onContinueAction)) {
                        onContinueAction(true)
                    }
                } else {
                    if (_.isFunction(onContinueAction)) {
                        onContinueAction(false)
                    }
                }
            }
        })
        .catch( err => {
            if (_.isFunction(onContinueAction)) {
                onContinueAction(false)
            }
        })
}
