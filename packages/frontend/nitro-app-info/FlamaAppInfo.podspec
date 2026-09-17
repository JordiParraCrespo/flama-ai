require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "FlamaAppInfo"
  s.version      = package["version"]
  s.summary      = "Sample Flama Nitro module"
  s.homepage     = "https://github.com/jordiparracrespo/flama-ai"
  s.license      = "MIT"
  s.authors      = "Flama"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/jordiparracrespo/flama-ai.git", :tag => "#{s.version}" }
  s.source_files = [
    "ios/**/*.{h,m,mm,swift}",
    "cpp/**/*.{hpp,cpp}",
  ]
  load "nitrogen/generated/ios/FlamaAppInfo+autolinking.rb"
  add_nitrogen_files(s)
end
