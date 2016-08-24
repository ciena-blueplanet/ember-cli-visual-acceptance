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

### Create new Baseline
The following sequence diagram shows the flow of creating new baselines.
![Sequence diagram Create New Baseline](images/SequenceDiagramCreateNewBaseline.png)
*__Figure 3:__ Sequence diagram Create New Baseline*

### Run CI Visual Acceptance
The following sequence diagram shows the sequence of `ember travis-visual-acceptance`. Focusing on creating environment variable `REPORT_JSON_PATH` that [Run Acceptance Tests](#run-acceptance-tests-1) makes use of to build a report ([Run Acceptance Tests](#run-acceptance-tests-1) skips building the report if the environment variable is not present). Additionally, it shows the workflow in the case of a PR is merged or is a regular PR build. 
![Sequence diagram Run Contionus Integration Visual Acceptance](images/SequenceDiagramRunCiVisualAcceptance.png)
*__Figure 4:__ Sequence diagram Run Contionus Integration Visual Acceptance*
