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

| Property   | Type   | Required? | Description                                                        | Default                                            |
| :--------- | :----- | :-------: | :----------------------------------------------------------------- | :------------------------------------------------- |
| `datetime` | String |           | The datetime value you are transforming. Must be a valid datetime. | `new Date()`                                       |
| `timezone` | String |           | The current timezone. Must be a valid timezone from IANA.          | `Intl.DateTimeFormat().resolvedOptions().timeZone` |

### Events

| Name     | Description                                    | Return                                                                                    |
| :------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `update` | Dispatched every time you change the timezone. | An object with the timezone selected and the transformed datetime based on that timezone. |

Check out the [Demo](./demo).

## A note on accessibility

I'm still working on making this 100% keyboard and screen reader accessible. Pull requests welcome!

## License

MIT License - fork, modify and use however you want.

[license-badge]: https://img.shields.io/npm/l/svelte-chroma-picker.svg?style=flat-square
