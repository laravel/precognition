# Laravel Precognition

<a href="https://github.com/laravel/precognition/actions"><img src="https://github.com/laravel/precognition/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/dt/laravel-precognition" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/v/laravel-precognition" alt="Latest Stable Version"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/l/laravel-precognition" alt="License"></a>

## Table of Contents

- [Introduction](#introduction)

## Introduction

This library provides a wrapper around [Axios](https://axios-http.com/) to make Precognition requests.

To get started you should install the package:

```sh
npm install laravel-precognition
```

The available request methods, which all return a `Promise`, are:

```js
import precognitive from 'laravel-precognition';

precognitive.get(url, config);

precognitive.post(url, data, config);

precognitive.patch(url, data, config);

precognitive.put(url, data, config);

precognitive.delete(url, config);
```

The optional `config` argument is the [Axios' configuration](https://axios-http.com/docs/req_config) object with some additional Precognition options, which are documented below.

## Handling Responses

The library has baked in configuration options that make handling common Precognition responses easier.

### Successful Responses

A `204 No Content` response with a `Precognition: true` header indicates that a Precognition request was successful. The `onPrecognitionSuccess` option is a convenient way to handle these responses:

```js
precognitive.post(url, data, {
    onPrecognitionSuccess: response => {
        // ...
    },
});
```

The function's `response` argument is the [Axios response](https://axios-http.com/docs/res_schema) object.

### Validation Responses

As validation is a common use-case for Precognition, we have included an `onValidationError` option:

```js
precognitive.post(url, data, {
    onValidationError: (errors, axiosError) => {
        emailError = errors.email[0];
    },
});
```

The function's `errors` argument is the error object from the [Laravel validation response](https://laravel.com/docs/validation#validation-error-response-format) and the `axiosError` argument is the [Axios error](https://axios-http.com/docs/handling_errors) object.

> **Note** Unlike the other error handlers seen below, `onValidationError` does not receive the standard Axios response object as it's first argument, however it is still available via `axiosError.response`.

### Error Responses

There are a few additional error response handlers for common Precognition response codes:

```js
precognitive.post(url, data, {
    onUnauthorized: (response, error) => /* ... */,
    onForbidden: (response, error) => /* ... */,
    onNotFound: (response, error) => /* ... */,
    onConflict: (response, error) => /* ... */,
    onLocked: (response, error) => /* ... */,
});
```

The function's `response` argument is the [Axios response](https://axios-http.com/docs/res_schema) object and the `error` argument is the [Axios error](https://axios-http.com/docs/handling_errors) object.

### Other Responses

You may handle additional response types as you normally would with Axios via the returned Promise:

```js
precognitive.post(url, data)
            .then(() => /* ... */)
            .catch(() => /* ... */)
            .finally(() => /* ... */);
```

### Non-Precognition Responses

If a response is received that does not have the `Precognition: true` header, an error will be thrown. You should ensure that the Precognition middleware is in place.

## Specifying Inputs For Validation

One of the features of Precognition is the ability to specify which inputs should be validated against. To use this feature you should pass a list of input names to the `validate` option:

```js
precognitive.post('/users', data, {
    validate: ['username', 'email'],
    onValidationError: errors => {
        // ...
    },
});
```

When sending a request with the `validate` option, the back-end will stop execution after validation, even when it passes.

## Using An Existing Axios Instance

If your application configures an Axios instance, you may use that instance for Precognition requests by passing it to the `use` function:

```js
import axios from 'axios';
import precognitive from 'laravel-precognition';

// Configure Axios...

window.axios = axios;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Configure Precognition...

window.precognitive = precognitive.use(axios);
```

## Aborting Stale Requests

When an [`AbortController` or `CancelToken`](https://axios-http.com/docs/cancellation) is not present in the configuration, when a new request is made any in-flight requests with the same "fingerprint" will be automatically aborted. A request's fingerprint is comprised of the request's method and URL.

In the following example, as the method and URL match for both requests, if request 1 is still waiting on a response when request 2 is fired, request 1 will be automatically aborted.

```js
// Request 1
precognitive.post('/projects/5', { name: 'Laravel' });

// Request 2
precognitive.post('/projects/5', { name: 'Laravel', repo: 'laravel/framework' });
```

If the URL or the method do not match, then the request would not be aborted:

```js
precognitive.post('/projects/5', { name: 'Laravel' });

precognitive.post('/repositories/5', { name: 'Laravel' });
```

You may customize how fingerprints are calculated by passing a callback to `fingerprintRequestsUsing`:

```js
import precognitive from 'laravel-precognition';

// Configure Precognition...

precognitive.fingerprintRequestsUsing((config, axios) => config.headers['Request-Fingerprint']);
```

Alternatively, you may pass the `fingerprint` option per request:

```js
precognitive.post('/projects/5', data, {
    fingerprint: 'request-1',
});

precognitive.post('/projects/5', data, {
    fingerprint: 'request-2',
});
```

A fingerprint of `null` will disable this feature. You may disable it globally via `fingerprintRequestsUsing`:

```js
import precognitive from 'laravel-precognition';

// Configure Precognition...

precognitive.fingerprintRequestsUsing(() => null);
```

or by passing `null` to the `fingerprint` option per request:

```js
precognitive.post('/projects/5', form.data(), {
    fingerprint: null,
});
```

## Polling

As polling with Precognition is a common use-case, the library comes with some handy polling features. To create a "poll" instance, you should call the `poll` function passing through a closure that should be executed while polling:

```js
import precognitive, { Poll } from 'laravel-precognition';

const poll = Poll(() => precognitive.get('/users/me', {
    onUnauthorized: () => poll.stop() && handleUnauthorized(),
}));

// start polling...

poll.start();

// stop polling...

poll.stop();
```

### Timeout

By default, the poll will have a timeout of one minute. To configure a different timeout, you should pass the duration to the `every` function:

```js
import precognitive, { Poll } from 'laravel-precognition';

const poll = Poll(() => precognitive.get('/users/me', {
    onUnauthorized: () => poll.stop() && handleUnauthorized(),
}));

poll.every({ minutes: 10 }).start();
```

You may pass hours, minutes, seconds, and milliseconds to the `every` function to get fine-grained control of the timeout:

```js
poll.every({
    hours: 3,
    minutes: 20,
    seconds: 11,
    milliseconds: 87,
}).start();
```

### Checking the Polling Status

To check if polling is active, you may invoke the `polling` function:

```js
if (poll.polling()) {
    // ...
}
```

You can also check the number of times the callback has been invoked:

```js
if (poll.invocations() > 1000) {
    poll.stop();
}
```

## Contributing

Thank you for considering contributing to Laravel Precognition! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

Please review [our security policy](https://github.com/laravel/precognition/security/policy) on how to report security vulnerabilities.

## License

Laravel Precognition is open-sourced software licensed under the [MIT license](LICENSE.md).
