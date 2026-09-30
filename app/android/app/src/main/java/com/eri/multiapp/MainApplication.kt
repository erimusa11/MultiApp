package com.eri.multiapp

import android.app.Application
import com.eri.multiapp.space.MultiAppSpacePackage
import com.eri.multiapp.space.Space
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(MultiAppSpacePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Self-heal: if we're running inside the Clone Space, make sure it's wired up.
    try {
      Space.setupInsideSpace(this)
    } catch (_: Exception) {
    }
    loadReactNative(this)
  }
}
