package com.flama.appinfo

import com.margelo.nitro.appinfo.HybridAppInfoSpec

class HybridAppInfo : HybridAppInfoSpec() {
  override fun getNativeModuleName(): String = "AppInfo"
}
