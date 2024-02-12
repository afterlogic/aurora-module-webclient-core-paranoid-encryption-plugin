<template>
  <app-dialog v-model="confirm" :close="cancel" align-actions="between">
    <template v-slot:content>
      <div class="q-mx-lg q-mt-lg q-mb-md">
        <div v-if="downloadFiles.length > 1">
          <div class="q-mb-md dialog__title-text">
            {{ `Encrypt ${downloadFiles.length} files?` }}
          </div>
          <div v-for="file in downloadFiles" :key="file.hash" class="text__caption q-mb-sm">
            <span>{{file.name}}</span>
          </div>
        </div>
        <div v-if="downloadFiles.length === 1" class="dialog__title-text">
          {{ `Encrypt "${downloadFiles[0].name}"?` }}
        </div>
      </div>
    </template>
    <template v-slot:actions>
      <button-dialog
          class="q-ma-sm"
          :action="upload"
          :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.ACTION_DONT_ENCRYPT')"
      />
      <button-dialog
          class="q-ma-sm"
          :action="uploadAndEncrypt"
          :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.ACTION_ENCRYPT')"
      />
    </template>
  </app-dialog>
</template>

<script>
import AppDialog from "src/components/common/AppDialog";
import ButtonDialog from "src/components/common/ButtonDialog";

import { mapGetters, mapActions } from 'pinia'
import { useFilesStore } from 'src/stores/index-all'

export default {
  name: "FileUploadTypeSelectionDialog",
  components: {
    AppDialog,
    ButtonDialog
  },
  computed: {
    ...mapGetters(useFilesStore, ['downloadFiles'])
  },
  watch: {
    confirm(val) {
      if (!val && !this.continueDownload) {
        this.cancel()
      }
    }
  },
  data: () => ({
    confirm: false,
    noEncryptMethods: null,
    encryptMethod: null,
    continueDownload: false,
    files: []
  }),
  methods: {
    ...mapActions(useFilesStore, ['removeSelectedUploadedFiles']),
    openDialog (encryptMethod, noEncryptMethods, files) {
      this.confirm = true
      this.noEncryptMethods = noEncryptMethods
      this.encryptMethod = encryptMethod
      this.files = files
      this.continueDownload = false
    },
    uploadAndEncrypt () {
      this.encryptMethod()
      this.continueDownload = true
      this.confirm = false
    },
    upload() {
      this.$root.nextUploadFiles({
        factory: this.noEncryptMethods.factory,
        added: null,
        uploaded: () => {},
        finish: this.noEncryptMethods.finish,
      })
      this.confirm = false
    },
    async cancel () {
      this.confirm = false
      this.removeSelectedUploadedFiles(this.files)
    }
  }
}
</script>

<style scoped>

</style>
