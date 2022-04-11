<template>
  <div class="q-pa-sm" v-if="recipient">
    <button-dialog
        :saving="saving"
        :action="getShareableParams"
        :label="$t('OPENPGPFILESWEBCLIENT.ACTION_ENCRYPT')"
    />
  </div>
</template>

<script>
import eventBus from 'src/event-bus'
import notification from "src/utils/notification";
import OpenPgp from "../../../../../../OpenPgpMobileWebclient/vue-mobile/openpgp-helper";
import { askOpenPgpKeyPassword } from "../../../../../../OpenPgpMobileWebclient/vue-mobile/utils";
import { getApiHost } from "src/api/helpers";
import CCrypto from "../../../../crypto/CCrypto";

import ButtonDialog from "components/common/ButtonDialog";
import { mapGetters, mapActions } from "vuex";

export default {
  name: "EncryptedShareableLinkActions",
  components: {
    ButtonDialog
  },
  computed: {
    ...mapGetters('core', ['userPublicId']),
    ...mapGetters('filesmobile', ['currentPath', 'currentStorage', 'currentFile']),
  },
  props: {
    recipient: { type: Object, default: () => ({ FullName: 'Not Selected', empty: true })}
  },
  data: () => ({
    shareableLinkParams: null,
    saving: false,
    passwordForSharing: '',
    showEncryptedLink: false,
    publicLink: '',
    creating: false
  }),
  methods: {
    ...mapActions('filesmobile', ['asyncUpdateExtendedProps', 'changeItemProperty']),
    ...mapActions('coreparanoidencryptionplugin', ['asyncCreatePublicLink']),
    getShareableParams() {
      eventBus.$emit('CoreParanoidEncryptionWebclient::getShareableParams', this.onStartEncrypt)
    },
    onStartEncrypt(shareableLinkParams) {
      console.log(shareableLinkParams, 'shareableLinkParams')
      this.shareableLinkParams = shareableLinkParams
      this.encrypt()
    },
    encrypt() {
        this.creating = true
        const privateKey = OpenPgp.getPrivateKeyByEmail(this.userPublicId)
        if (privateKey) {
          let sPassphrase = privateKey.getPassphrase()
          if (sPassphrase) {
            this.encryptLink(sPassphrase)
          } else {
            askOpenPgpKeyPassword(this.userPublicId, this.$root._getParentComponent, this.encryptLink)
          }
        } else {
          this.creating = false
          notification.showError('No private key found for message decryption.')
        }

    },
    encryptLink (passPassphrase) {
      this.passphrase = passPassphrase

      const privateKey = OpenPgp.getPrivateKeyByEmail(this.userPublicId)
      const publicKey = OpenPgp.getPublicKeyByEmail(this.userPublicId)
      const principalsEmails = []
      if(this.shareableLinkParams && this.shareableLinkParams?.recipient?.ViewEmail) {
        principalsEmails.push(this.shareableLinkParams.recipient.ViewEmail)
      }
      const passwordBasedEncryption = this.shareableLinkParams?.encryptionType === 'password'
      CCrypto.getEncryptedKey(this.currentFile, privateKey, publicKey, this.userPublicId, passPassphrase, null, passwordBasedEncryption, principalsEmails).then( async (encryptKey) => {
        if (encryptKey?.sError) {
          this.creating = false
          notification.showError(encryptKey.sError)
        } else if (encryptKey) {
          this.passwordForSharing = encryptKey.password
          const parameters = {
            type: this.currentStorage.Type,
            path: this.currentPath,
            name: this.currentFile.name,
            paranoidKey: {
              value: encryptKey.data,
              key: 'ParanoidKeyPublic'
            },
          }
          const result = await this.asyncUpdateExtendedProps(parameters)
          if (result) {
            await this.createEncryptPublicLink()
            if (!this.shareableLinkParams?.recipient?.empty) {
              if (this.shareableLinkParams.recipient.HasPgpPublicKey) {
                this.$emit('onProhibitSelectionRecipient')
              }
            }
            this.$emit('isLinkCreated')
          }
        }
      })
    },
    async createEncryptPublicLink () {
      const parameters = {
        Type: this.currentStorage.Type,
        Path: this.currentPath,
        Name: this.currentFile.name,
        Size: this.currentFile.size,
        IsFolder: this.currentFile.isFolder,
        RecipientEmail: this.shareableLinkParams.recipient?.empty ? '' : this.shareableLinkParams.recipient.ViewEmail,
        PgpEncryptionMode: this.shareableLinkParams.encryptionType,
        LifetimeHrs: 0
      }
      const result = await this.asyncCreatePublicLink(parameters)

      if (result) {
        this.showEncryptedLink = true
        this.publicLink = getApiHost() + result.link
        this.creating = false
        this.changeItemProperty({
          item: this.currentFile,
          property: 'publicLink',
          value: getApiHost() + result.link
        })
        this.changeItemProperty({
          item: this.currentFile,
          property: 'linkPassword',
          value: this.passwordForSharing
        })
      }
    },
  },
}
</script>

<style scoped>

</style>
