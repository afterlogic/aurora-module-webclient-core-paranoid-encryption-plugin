<template>
  <app-dialog v-model="confirm" :close="cancel">
    <template v-slot:head>
      <div class="q-mx-md q-mt-md" style="color: #929292; font-size: 10pt">
        <div v-if="downloadFiles.length > 1">
          <div class="q-mb-md">
            {{ `Encrypt ${downloadFiles.length} files?` }}
          </div>
          <div v-for="file in downloadFiles" :key="file.hash">
            <span>{{file.name}}</span>
          </div>
        </div>
        <div v-if="downloadFiles.length === 1">
          {{ `Encrypt "${downloadFiles[0].name}"?` }}
        </div>
      </div>
    </template>
    <template v-slot:actions>
      <button-dialog
          :action="uploadAndEncrypt"
          label="Encrypt"
      />
      <button-dialog
          :action="upload"
          label="Do not Encrypt"
      />
    </template>
  </app-dialog>
</template>

<script>
import AppDialog from "src/components/common/AppDialog";
import ButtonDialog from "src/components/common/ButtonDialog";
import { mapGetters } from "vuex";

import { mapActions } from 'vuex'

export default {
  name: "FileUploadTypeSelectionDialog",
  components: {
    AppDialog,
    ButtonDialog
  },
  computed: {
    ...mapGetters('filesmobile', ['downloadFiles'])
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
    ...mapActions('filesmobile', ['removeSelectedUploadedFiles']),
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
