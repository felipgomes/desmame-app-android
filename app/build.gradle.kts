plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.desmame.tracker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.desmame.tracker"
        // "minSdk 21" cobre até o Android 5.0 (Lollipop). Para salvar arquivos
        // em Downloads em versões anteriores ao Android 10 (API 29), é preciso
        // pedir a permissão de armazenamento em tempo de execução — ver
        // MainActivity.kt e WebAppInterface.kt.
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.core:core-ktx:1.13.1")
}
