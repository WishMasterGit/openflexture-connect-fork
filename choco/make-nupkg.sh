silentArgs='/S'
fileType='exe'

deployRoot='https://build.openflexure.org/openflexure-ev'

scriptPath=`dirname $0`
packagePath="$(dirname "$scriptPath")"
packageJson="$packagePath/package.json"

outpath="$scriptPath/release"
toolspath="$outpath/tools"

mkdir -p $toolspath

echo $scriptPath
echo $packageJson
echo $outpath

productName=$(cat $packageJson \
  | grep productName \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | sed 's/^ *//g')

echo "$productName"

publisher=$(cat $packageJson \
  | grep publisher \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | sed 's/^ *//g')

echo "$publisher"

description=$(cat $packageJson \
  | grep description \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | sed 's/^ *//g')

echo "$description"

packageName=$(cat $packageJson \
  | grep name \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

echo "$packageName"

# Get package version from package.json
packageVersion=$(cat $packageJson \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

echo "$packageVersion"

# Build installer URL
instURL="$deployRoot/openflexure-connect-$packageVersion-win.exe"
echo $instURL

# Build nuspec
cat > "$outpath/openflexureConnect.nuspec" <<- EOL
<?xml version="1.0"?>
<package xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <metadata>
    <id>$packageName</id>
    <title>$productName</title>
    <version>$packageVersion</version>
    <authors>$publisher</authors>
    <owners>Bath Open Instrumentation Group</owners>
    <summary>$description</summary>
    <description>$description</description>
    <projectUrl>https://www.openflexure.org/</projectUrl>
    <docsUrl>https://www.openflexure.org/projects/microscope/</docsUrl>

    <bugTrackerUrl>https://gitlab.com/openflexure/openflexure-connect/issues</bugTrackerUrl>
    <projectSourceUrl>https://gitlab.com/openflexure/openflexure-connect/</projectSourceUrl>
    <packageSourceUrl>https://gitlab.com/openflexure/openflexure-connect/</packageSourceUrl>
    
    <tags>openflexure microscope connect</tags>
    <licenseUrl>https://gitlab.com/openflexure/openflexure-connect/raw/master/LICENSE</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <iconUrl>$deployRoot/512x512.png</iconUrl>
  </metadata>
  <files>
    <file src="tools/**" target="tools" />
  </files>
</package>
EOL

# Build installer PS1 content
instPS1="Install-ChocolateyPackage $packageName $fileType $silentArgs $instURL"
echo $instPS1 > "$toolspath/chocolateyInstall.ps1"
