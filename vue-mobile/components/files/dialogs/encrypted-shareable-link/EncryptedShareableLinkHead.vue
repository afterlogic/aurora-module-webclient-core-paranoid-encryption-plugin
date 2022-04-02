<template>
  <div>
    <div>
      <div class="q-mx-lg q-mb-sm recipient">
        <span>{{ $t('OPENPGPFILESWEBCLIENT.LABEL_RECIPIENT') }}:</span>
      </div>
      <app-contact-item  @click="changeRecipient" class="q-pb-md q-mx-lg" :contact="recipient"/>
      <div class="q-px-lg">
        <span class="inscription">
          {{ contactInscription }}
        </span>
      </div>
      <div class="header q-mx-lg">
        <span>Encryption type</span>
      </div>
      <div class="q-mx-md q-mt-md">
        <q-option-group
            class="encryption-type"
            v-model="shareableLinkParams.encryptionType"
            keep-color
            size="32px"
            :options="encryptOptions"
            type="radio"
        />
      </div>
      <div class="separator q-mt-md"/>
      <div class="q-my-md q-mx-lg">
        <span class="inscription">{{ encryptionTypeInscription }}</span>
      </div>
      <div class="q-mx-lg">
        <app-checkbox
            :disable="shareableLinkParams.encryptionType === 'password'"
            v-model="shareableLinkParams.addDigitalSignature"
            :leftLabel="true"
            :label="$t('OPENPGPFILESWEBCLIENT.LABEL_SIGN')"
        />
      </div>
      <div class="q-my-md q-mx-lg inscription">
        <span>
          {{ inscription }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import eventBus from "src/event-bus";
import { mapActions } from 'vuex'
import AppContactItem from "components/common/AppContactItem";
import AppCheckbox from "components/common/AppCheckbox";

export default {
  name: "EncryptedShareableLinkHead",
  components: {
    AppContactItem,
    AppCheckbox
  },
  props: {
    recipient: { type: Object, default: () => ({ FullName: 'Not Selected', empty: true })}
  },
  data: () => ({
    shareableLinkParams: {
      recipient: { FullName: 'Not Selected', empty: true },
      encryptionType: 'password',
      addDigitalSignature: false,
    },
  }),
  async mounted() {
    eventBus.$on('CoreParanoidEncryptionWebclient::getShareableParams', this.sentShareableLinkParams)
    await this.asyncGetExternalsKeys()
  },
  computed: {
    contactInscription() {
      console.log('contactInscription')
      if (this.recipient?.empty){
        return this.$t('OPENPGPFILESWEBCLIENT.HINT_ONLY_PASSWORD_BASED')
      }
      if (this.recipient?.HasPgpPublicKey) {
        return this.$t('OPENPGPFILESWEBCLIENT.HINT_KEY_RECIPIENT')
      }
      return this.$t('OPENPGPFILESWEBCLIENT.HINT_NO_KEY_RECIPIENT')
    },
    encryptionTypeInscription() {
      if (this.shareableLinkParams.encryptionType === 'password') {
        return this.$t('OPENPGPFILESWEBCLIENT.HINT_PASSWORD_BASED_ENCRYPTION')
      }
      return this.$t('OPENPGPFILESWEBCLIENT.HINT_KEY_BASED_ENCRYPTION')
    },
    encryptOptions() {
      return [
        {
          label: this.$t('OPENPGPFILESWEBCLIENT.LABEL_KEY_BASED_ENCRYPTION'),
          value: 'key',
          color: 'primary',
          disable: !this.recipient?.HasPgpPublicKey
        },
        {
          label: this.$t('OPENPGPFILESWEBCLIENT.LABEL_PASSWORD_BASED_ENCRYPTION'),
          value: 'password',
          color: 'primary'
        },
      ]
    },
    inscription() {
      if (this.shareableLinkParams?.encryptionType === 'key') {
        if (this.shareableLinkParams.addDigitalSignature) {
          return this.$t('OPENPGPFILESWEBCLIENT.HINT_SIGN_FILE')
        }
        return this.$t('OPENPGPFILESWEBCLIENT.HINT_NOT_SIGN_FILE')
      }
      return this.$t('OPENPGPFILESWEBCLIENT.HINT_NOT_SIGN_FILE_REQUIRES_KEYBASED_ENCRYPTION')
    }
  },
  watch: {
    'shareableLinkParams.encryptionType'(type) {
      if (type === 'password') {
        this.shareableLinkParams.addDigitalSignature = false
      }
      if (type === 'key') {
        this.shareableLinkParams.addDigitalSignature = true
      }
    },
  },
  methods: {
    ...mapActions('filesmobile', ['getContactSuggestions']),
    ...mapActions('openpgpmobile', ['asyncGetExternalsKeys']),
    changeRecipient() {
      this.$emit('selectRecipient')
    },
    sentShareableLinkParams(callback) {
      if (callback) {
        this.shareableLinkParams['recipient'] = this.recipient
        callback(this.shareableLinkParams)
      }
    }
  },
  unmounted() {
    eventBus.$off('CoreParanoidEncryptionWebclient::getShareableParams', this.sentShareableLinkParams)
  }
}
</script>

<style lang="scss">
.inscription {
  font-size: 12px;
  line-height: 14px;

  color: #B6B5B5;
}
.header {
  margin-top: 24px;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
}
.separator {
  width: 100%;
  border: 1px solid #F6F6F6;
}

.contact-search .q-field__control {
  height: 36px;
  padding: 0 4px !important;
}
.recipient {
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
  color: #4B4A4A;
}
.encryption-type .q-radio.disabled {
  opacity: 0.55 !important;
}
</style>
