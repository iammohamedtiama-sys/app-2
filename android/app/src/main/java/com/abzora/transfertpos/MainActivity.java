package com.abzora.transfertpos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function(){try{return !!(window.__yamHandleNativeBack && window.__yamHandleNativeBack());}catch(e){return false;}})()",
                value -> {
                    if (!"true".equalsIgnoreCase(String.valueOf(value))) {
                        MainActivity.super.onBackPressed();
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }
}
