<script>
  import Picker from '../src/Picker.svelte';
  import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
  import { format, parseISO } from 'date-fns';

  let datetime = '2020-09-15T10:00';
  let payload = {};

  const update = (ev) => {
    payload.timezone = ev.detail.timezone;
    payload.utcDatetime = zonedTimeToUtc(parseISO(datetime), payload.timezone);
    payload.zonedDatetime = utcToZonedTime(payload.utcDatetime, payload.timezone);
  };
</script>

<div data-testid="picker">
  <Picker on:update="{update}" timezone="Europe/London" />
</div>

{#if Object.keys(payload).length > 0}
<p data-testid="payload-timezone">{payload.timezone}</p>
<p data-testid="payload-zonedDatetime">{payload.zonedDatetime}</p>
<p data-testid="payload-utcDatetime">{payload.utcDatetime}</p>
{/if}
