#!/bin/sh
# Xcode Cloud: nach dem Klonen dasselbe wie `npm run ios:build` am Mac, damit Archive und TestFlight
# ohne Handgriffe laufen. FUJI_IMPRESSUM_ADRESSE kommt als geheime Variable aus dem Workflow.
set -eu

export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node@22
export PATH="$(brew --prefix node@22)/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci
npm run ios:build

# cap sync schreibt die Swift-Pakete neu; Xcode Cloud löst sie nicht selbst auf, darum hier
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
