# `autoarboriculturist`

A hastily hacked Github Action to automatically update `npm` packages that strives for Github Marketplace citizenship

## Design goals

* To give more people the chance to use in their everyday life the word *autoarboriculturist*
    (and does so without impeding the final user who has to correctly spell my name anyway - which means that a copy&paste is already the only solution)
* To provide an easy to use replacement for Snyk that is *good-enough* for most open-source packages on `npm`

## Status

Some parts work sometimes

## Usage

### Workflow permissions

For this action to work you must explicitly allow GitHub Actions to create pull requests.
This setting can be found in a repository's settings under Actions > General > Workflow permissions.

For repositories belonging to an organization, this setting can be managed by admins in organization settings under Actions > General > Workflow permissions.
