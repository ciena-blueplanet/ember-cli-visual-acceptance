# Introduction
 This document provides the architectural outline of [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance).
 
## Scope
 
 The scope of this document is to describe the architectural goals and constraints, use cases, dynamic model (state-machine diagrams, sequence diagrams), system decomposition, hardware/software mapping, and subsystem services.

# Use cases
 
 The following are the set of use cases that are significant to [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance):
  - Run acceptance tests
  - Create new Baseline
  - Run Contionus Integration(CI) Visual Acceptance
![Sequence diagram Run Acceptance Tests](images/use-cases.png)
*__Figure 1:__ Use Cases*

## Use Case Descriptions

### Run Acceptance Tests

A User or Contionus Integration system runs `ember test`. Calling [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance)'s capture function, creating new baseline if this is the first run. Otherwise [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance) will compare the baseline to the current image, asserting an error if the misMatch percentage is greater than the margin allowed (default 0.00%) and creating a new baseline if it is above.

### Create new Baseline

A User or Contionus Integration system runs `ember new-baseline`. Clearing all baselines so [Run Acceptance Tests](#run-acceptance-tests) creates new ones.

### Run CI Visual Acceptance

A User or Contionus Integration system runs `ember travis-visual-acceptance`, or some variation. This use case handles commenting on a Pull Request(PR) and commiting a [new baseline](#create-new-baseline) when the PR is merged.

# Sequence Diagrams

## Run Acceptance Tests

The following sequence diagram has been simplified to represent a single call of [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance)'s capture function.
![Sequence diagram Run Acceptance Tests](images/SequenceDiagramEmberVisualAcceptanceRunAcceptanceTests.png)
*__Figure 2:__ Sequence diagram Run Acceptance Tests*

Due to the size of this sequence diagram the following will describe each top level __alt__ frame:
1. The first alt frame is simple. If the app/addon has [target browsers specified](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance#target-browser-and-os-version) the previous `isTargetBrowser()` will compare the current browser to the specified target browsers saved (if there are non specified it will return true), return false if the browser does not match the target. If the browser does not match the target the capture function will resolve, skipping the visual acceptance test.
2. The next alt frame checks to see if the browser is PhantomJS or SlimerJS (both have `window.callPhantom`). If the browser is SlimerJS or PhantomJS [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance) will render the webpage as a base image (using [renderBase64](http://phantomjs.org/api/webpage/method/render-base64.html)), cropping the image to only include the `targetElement`. If the browser is not SlimerJS or PhantomJS [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance) uses [html2canvas](http://html2canvas.hertzen.com/) to render an image of the targetElement.
    * [html2canvas](http://html2canvas.hertzen.com/) notes:
      * Canvas support is strongest in Chrome. 
      * Make sure to use the `experimentalSvgs` option if there are svgs present on the page that you wish to render( more info can be found [here, in the html2canvas section](https://ciena-blueplanet.github.io/developers.blog/2016/07/18/Using-ember-cli-visual-acceptance.html))
3. The third alt frame looks at getting the baseline image. If there is no baseline send a response with an error attribute. Otherwise send back a response with a image attribute whose value is the base64 representation of the baseline image.
4. The next alt frame creates a new baseline if there is no previous baseline (third alt frame sent back a response with the error attribute). Following the creation of the baseline [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance) will then append the result to the report if the environment variable was set in [Run CI Visual Acceptance](#run-ci-visual-acceptance-1), uploading the images the report references to eithier Imgur or some external API (if the environment variable `API_URL` is set. This environment variable is set in `ember teamcity-bitbucket-visual-acceptance`). After the report is updated the sequence will resolve (ending execution of visual-acceptance). If the response does give an image to compare to [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance) will use [ResembleJS](https://huddle.github.io/Resemble.js/) to compare the baseline image to the current image.
5. The final alt frame deals with the result of [ResembleJS](https://huddle.github.io/Resemble.js/). If the misMatch percentage is less than or equal to the margin (default 0.00%) it will save the current image as the new baseline. Otherwise the test is considered to have failed. In such case it will save the image to the filesystem, but appending `failed` to the image name. Then the failed image will be added to the report. The failed section in the report will contain the current image, the baseline image, and the diff of the two images created by [ResembleJS](https://huddle.github.io/Resemble.js/). Those images will be uploaded to eithier Imgur or the external API.

### Create new Baseline
The following sequence diagram shows the flow of creating new baselines.
![Sequence diagram Create New Baseline](images/SequenceDiagramCreateNewBaseline.png)
*__Figure 3:__ Sequence diagram Create New Baseline*

### Run CI Visual Acceptance
The following sequence diagram shows the sequence of `ember travis-visual-acceptance`. Focusing on creating environment variable `REPORT_JSON_PATH` that [Run Acceptance Tests](#run-acceptance-tests-1) makes use of to build a report ([Run Acceptance Tests](#run-acceptance-tests-1) skips building the report if the environment variable is not present). Additionally, it shows the workflow in the case of a PR is merged or is a regular PR build. 
![Sequence diagram Run Contionus Integration Visual Acceptance](images/SequenceDiagramRunCiVisualAcceptance.png)
*__Figure 4:__ Sequence diagram Run Contionus Integration Visual Acceptance*

# Browser Systems

## PhantomJS

PhantomJS is a headless WebKit scriptable with a JavaScript API. PhantomJS Webkit is about a year behind Safari’s Webkit version. Resulting less accurate representations of your Application/Addon.

## SlimerJS
It is a tool like PhantomJs, except that it runs Gecko instead of Webkit. And its version of Gecko matches the latest Firefox. Producing 1:1 images that are produced in Firefox. The only downside to this tool is that it an SVG that uses xlink:href will result in a segmentation fault if the image is not found. [There is a PR to resolve this issue](https://github.com/laurentj/slimerjs/pull/518) but has yet to be merged in.

## Firefox
Firefox makes use of [html2canvas](http://html2canvas.hertzen.com/) to render its image. The canvas support is inferior to Chrome's but with the use of [ember-cli-visual-acceptance](https://github.com/ciena-blueplanet/ember-cli-visual-acceptance)'s `experimentalSvgs` option it does make a good contender.

## Chrome
Chrome also makes use of [html2canvas](http://html2canvas.hertzen.com/) to render its image. Chrome's canvas support is by far the best amongst all web browsers, producing very accurate images.

## Others Web browsers
Other Web browsers such as Internet Explorer and Safari can be used but their accuracy depends on their canvas support and [html2canvas](http://html2canvas.hertzen.com/)'s ability to handle them.
