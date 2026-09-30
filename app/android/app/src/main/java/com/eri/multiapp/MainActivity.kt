package com.eri.multiapp

import android.content.Context
import android.os.Bundle
import android.view.WindowManager
import com.eri.multiapp.space.Space
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MultiApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // SECURITY: apply "hide from screenshots & recents" before any content is drawn.
    val prefs = getSharedPreferences(Space.PREFS_SECURITY, Context.MODE_PRIVATE)
    if (prefs.getBoolean(Space.KEY_SECURE_SCREEN, false)) {
      window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    super.onCreate(savedInstanceState)
    // SECURITY: ignore taps while another app draws over us (tapjacking).
    window.decorView.filterTouchesWhenObscured = true
  }
}
