# timezone-picker

## Installation

```
yarn add svelte-timezone-picker
```

```
npm i --save svelte-timezone-picker
```

## Usage

To use it, simply import it as a svelte component.

```html
<script>
  import TimezonePicker from 'svelte-timezone-picker';

  let datetime = '2020-06-10T19:30';
  let timezone = 'Europe/London';
</script>

<TimezonePicker {datetime} {timezone} />
```

### Props

| Property           | Type    | Required? | Description                                                                      | Default                                            |
| :----------------- | :------ | :-------: | :------------------------------------------------------------------------------- | :------------------------------------------------- |
| `datetime`         | String  |           | The datetime value you are transforming. Must be a valid datetime.               | `new Date()`                                       |
| `timezone`         | String  |           | The current timezone. Must be a valid timezone from IANA.                        | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| `open`             | Boolean |           | Whether the dropdown should be automatically expanded or not.                    | `false`                                            |
| `allowedTimezones` | Array   |           | Control which timezones display in the list. Must be a valid timezone from IANA. | `null`                                             |

### Events

| Name     | Description                                    | Return                                                                                    |
| :------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `update` | Dispatched every time you change the timezone. | An object with the timezone selected and the transformed datetime based on that timezone. |

Check out the [Demo](./demo).

## License

MIT License - fork, modify and use however you want.

[license-badge]: https://img.shields.io/npm/l/svelte-timezone-picker.svg?style=flat-square
