# Laravel Precognition

<a href="https://github.com/laravel/precognition/actions"><img src="https://github.com/laravel/precognition/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/dt/laravel-precognition" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/v/laravel-precognition" alt="Latest Stable Version"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/l/laravel-precognition" alt="License"></a>

## Table of Contents

- [Introduction](#introduction)

## Introduction

This library provides a wrapper around [Axios](https://axios-http.com/) to make Precognition requests. Every request sent via the helper will be a Precognition request.

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

A `204 No Content` response with an included `Precognition: true` header indicates that a Precognition request was successful. The `onPrecognitionSuccess` option is a convenient way to handle these responses:

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

There are a few additional error responses handlers for common Precognition response codes:

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

### Automatically Aborting Stale Request

When an [`AbortController` or `CancelToken`](https://axios-http.com/docs/cancellation) are not present in the configuration, the Precognition client automatically aborts any in-flight requests when a new request is made, but only the requests share the same "fingerprint". A request's fingerprint is comprised of the request method and URL.

In the following example, as the method and URL match for both requests, if request 1 is still waiting on a response when request 2 is fired, request 1 will be automatically aborted.

```js
// Request 1
precog.post('/projects/5', { name: 'Laravel' })

// Request 2
precog.post('/projects/5', { name: 'Laravel', repo: 'laravel/framework' })
```

If the URL or the method do not match, then the request would not be aborted:

```js
precog.post('/projects/5', { name: 'Laravel' })

precog.post('/repositories/5', { name: 'Laravel' })
```

You may customize how the Precognition client fingerprints requests by passing a callback to `fingerprintRequestsUsing`:

```js
import precog from 'laravel-precognition';

precog.fingerprintRequestsUsing((config, axios) => config.headers['Request-Id'])
```

It is also possible to specify the `uniqueId` on a per request basis:

```js
precog.post('/projects/5', form.data(), {
    requestId: 'unique-id-1',
})

precog.post('/projects/5', form.data(), {
    requestId: 'unique-id-2',
})
```

If you would like to disable this feature globally, you should return `null` from the callback passed to `fingerprintRequestsUsing`:

```js
precog.fingerprintRequestsUsing(() => null)
```

You can also disable to feature on a per request basis by passing `null` as the `requestId` option:

```js
precog.post('/projects/5', form.data(), {
    requestId: null,
})
```

### Polling

```js
import precog from 'laravel-precognition'

const poll = precog.poll(client => client.post(url, data, { ... }))
                   .every({ seconds: 15 })

// start polling...

poll.start()

// stop polling...

poll.stop()
```

To configure the timeout, you specify the duration via the `every` function:

```js
const poll = precog.poll(() => /* ... */).every({
    hours: 2,
    minutes: 10,
    seconds: 24,
    milliseconds: 5,
})
```

If you adjust the timeout while the poll is running, it will become the timeout after the next tick of the poll. However, if you stop the poll first, it will become the timeout once started:

```js
const poll = precog.poll(() => /* ... */)

poll.every({ hours: 1 }).start()

poll.stop().every({ hours: 2 }).start()
```

You may also check if polling is active:

```js
if (poll.polling()) {
    // ...
}
```

### Using An Existing Axios Instance

If your application already configures an Axios instance, you may instruct Precognition to use that instance by calling `precognition.use(axios)`:

```js
import axios from 'axios';
import precognition from 'laravel-precognition';

// Configure Axios...

window.axios = axios;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Use the configured instance...

window.precog = precognition.use(axios)
```

## Contributing

Thank you for considering contributing to Laravel Precognition! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

Please review [our security policy](https://github.com/laravel/precognition/security/policy) on how to report security vulnerabilities.

## License

Laravel Precognition is open-sourced software licensed under the [MIT license](LICENSE.md).
