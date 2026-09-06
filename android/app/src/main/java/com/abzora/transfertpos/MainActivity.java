package com.abzora.transfertpos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
