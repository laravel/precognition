# Laravel Precognition

<a href="https://github.com/laravel/precognition/actions"><img src="https://github.com/laravel/precognition/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/dt/laravel-precognition" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/v/laravel-precognition" alt="Latest Stable Version"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/l/laravel-precognition" alt="License"></a>

## Introduction

This library provides a thin wrapper around the Axios client to help make Precognition requests. To get started you should install the package:

```sh
npm install laravel-precognition
```

Every request sent via the helper will be sent as a Precognition request. The available request methods, which all return a `Promise`, are:

```js
import precog from 'laravel-precognition';

precog.get(url, config);
precog.post(url, data, config);
precog.patch(url, data, config);
precog.put(url, data, config);
precog.delete(url, config);
```

The `config` parameter is the [Axios' configuration](https://axios-http.com/docs/req_config) with some additional Precognition specific options as documented below.

### Handling Successful Responses

When Precognition is successful, a `204 No Content` response with an included `Precognition: true` header is returned. The `onPrecognitionSuccess` configuration option can be used to handle a successful Precognition response:

```js
precog.post(url, data, {
    onPrecognitionSuccess: (response) => {
        // Precognition was successful...
    },
});
```

The function receives the [Axios response object](https://axios-http.com/docs/res_schema).

### Handling Validation Responses

As validation is a common use-case for Precognition, we have included a few validation specific affordances. To handle a Laravel validation error response, you may use the `onValidationError` configuration option:

```js
precog.post(url, data, {
    onValidationError: (errors, axiosError) => {
        usernameError = errors.username?[0];
    },
});
```

The function receives the `errors` object from the [validation response](https://laravel.com/docs/validation#validation-error-response-format) and the [Axios error object](https://axios-http.com/docs/handling_errors).

### Specifying Inputs For Validation

One of the features of Precognition is the ability to specify the inputs that you would like to run validation rules against. To use this feature you should pass a list of input names to the `validate` configuration option:

```js
precog.post('/users', { ... }, {
    validate: ['username', 'email'],
    onValidationError: (errors, axiosError) => {
        // ...
    },
});
```

### Handling Error Responses

There are a few more common error responses that Precognition requests may return. The following outline some configuration options to handle those common response types:

```js
precog.post(url, data, {
    onUnauthorized: (response, axiosError) => /* ... */,
    onNotFound: (response, axiosError) => /* ... */,
    onConflict: (response, axiosError) => /* ... */,
    onLocked: (response, axiosError) => /* ... */,
});
```

These functions receives the [Axios response object](https://axios-http.com/docs/res_schema) and the [Axios error object](https://axios-http.com/docs/handling_errors).

### Handling Other Responses

As the library is just a wrapper around Axios, you can handle other responses as you normally would via `.then()`, `.catch()`, and `.finally()`.

```js
loading = true;

precog.post(url, data, { /* ... */ })
    .catch((error) => {
        if (error.response?.status === 418) {
            // ...
        }
    })
    .finally(() => loading = false);
```

### Receiving Non-Precognition Responses

If the Precognition client receives a server response that does not have the `Precognition: true` header set, it will throw an error. You should ensure that the Precognition middleware is in place for the route.

### Automatically Aborting Stale Request

When an [`AbortController` or `CancelToken`](https://axios-http.com/docs/cancellation) are not passed in the request configuration, the Precognition client automatically aborts any still in-flight requests when a new request is made, but only if the new request matches a previous request's signature. It identifies requests by combining the request method and URL.

In the following example, because the method and URL match for both requests, if request 1 is still waiting on a response when request 2 is fired, request 1 will be aborted.

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

To customize how the Precognition client identifies requests you should pass a callback to `userRequestIdentifier` that returns a string representing the request:

```js
import precog from 'laravel-precognition';

precog.useRequestIdentifier((config) => config.headers.Request-Id)
```

If you would like to disable this feature, return `null` from the callback:

```js
precog.useRequestIdentifier(() => null)
```

It is also possible to specify the unique identifier when making the request.

```js
precog.post('/projects/5', form.data(), {
    requestIdentifier: 'unique-id-1',
})

precog.post('/projects/5', form.data(), {
    requestIdentifier: 'unique-id-2',
})
```

You may also disable to feature inline by passing `null` as the request identifier:

```js
precog.post('/projects/5', form.data(), {
    requestIdentifier: null,
})
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
