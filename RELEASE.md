# Release Instructions

The following commands should be run when doing a release, where `{semver-type}` is `major`, `minor`, or `patch`.

```sh
bin/release {semver-type}
git tag "{version}"
git push origin main
git push origin --tags
npm publish --workspaces
```

Releases are managed by [@taylorotwell](https://github.com/taylorotwell), [@jessarcher](https://github.com/jessarcher), and [@timacdonald](https://github.com/timacdonald) for this repository.
