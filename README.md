# Laravel Precognition

<a href="https://github.com/laravel/precognition/actions"><img src="https://github.com/laravel/precognition/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/dt/laravel-precognition" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/v/laravel-precognition" alt="Latest Stable Version"></a>
<a href="https://www.npmjs.com/package/laravel-precognition"><img src="https://img.shields.io/npm/l/laravel-precognition" alt="License"></a>

## Table of Contents

- [Introduction](#introduction)
- [Handling Responses](#handling-responses)
    - [Successful Responses](#successful-responses)
    - [Validation Responses](#validation-responses)
    - [Error Responses](#error-responses)
    - [Other Responses](#other-responses)
    - [Non-Precognition Responses](#non-precognition-responses)
- [Specifying Inputs For Validation](#specifying-inputs-for-validation)
- [Using An Existing Axios Instance](#using-an-existing-axios-instance)
- [Aborting Stale Requests](#aborting-stale-requests)
- [Polling](#polling)
    - [Timeout](#timeout)
    - [Checking the Status](#checking-the-status)

## Introduction

Laravel Precognition allows you to anticipate the outcome of a future request. Some ways Precognition may be used include:

- Live validation of forms, powered by Laravel validation rules.
- Notifying users that a resource they are editing has been updated since it was retrieved.
- Notifying users their session has expired.

This library provides frontend helpers to make working with Precognition a dreamy delight.

There is also a [Vue flavoured library](https://github.com/laravel/precognition-vue) available.

## Official Documentation

Documentation for the Laravel Vite plugin can be found on the [Laravel website](https://laravel.com/docs/precognition).

## Contributing

Thank you for considering contributing to Laravel Precognition! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

Please review [our security policy](https://github.com/laravel/precognition/security/policy) on how to report security vulnerabilities.

## License

Laravel Precognition is open-sourced software licensed under the [MIT license](LICENSE.md).
