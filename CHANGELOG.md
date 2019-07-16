# Change Log

## [0.9.0]
- watches grouping
- fix last chunk load
- configurable chunk size
- extension bundling for faster loading

## [0.8.5]
- fix clear command

## [0.8.4]
- support ~ and $HOME at the begining of pattern

## [0.8.3]
- improve follow tail
- prevent new content form being selected after jumping at the end of the document

## [0.8.2]
- fix clear/reset

## [0.8.0]
- add option to notify on change in the status bar 

## [0.7.0]
- add encoding option

## [0.6.4]
- fix relative patterns on windows

## [0.6.3]
- Fix matching static file patterns

## [0.6.2]
- Do not overwrite vscode log highlighting

## [0.6.1]
- Fix bug introduced in 0.6.0 that broke patterns to specific files

## [0.6.0]
- Handle escaped characters in patterns
- Add `logViewer.windows.allowBackslashAsPathSeparator` option to be able to escape characters in windows, e.g.: `"C:/Program Files \\(x86\\)/MyApp/(server|client)/*.log"`

## [0.5.1]
- Option to select workspace in multi-root workspaces

## [0.5.0]
- UI redesign, adds a new section in the activity bar

## [0.4.2]
- Fix handling "/" as a path separator in patterns in windows

## [0.4.0]
- Automatically follow and unfollow tail based on scroll position

  Requires VS Code 1.22

## [0.3.1]
- Small performance improvements
- Denpendency updates

## [0.3.0]
- Relative paths support

## [0.2.1]
- Open current file from status bar    
- Bugfixes

## [0.2.0]
- Replace chokidar with custom implementation better suited for this use case. Improved perfomance with:
    - Patterns that match a lot of files
    - Files over the network
- Ability to set options per watch


## [0.1.3]
- Fix oudated file info in status bar

## [0.1.2]
- Initial release