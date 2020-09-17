<script>
  import Picker from '../src/Picker.svelte';
  import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
  import { format, parseISO } from 'date-fns';

  let datetime = '2020-09-15T10:00';
  let allowedTimezones = ['Europe/London', 'Africa/Abidjan', 'Asia/Istanbul'];
  let payload = {};

  const update = (ev) => {
    payload.timezone = ev.detail.timezone;
    payload.utcDatetime = zonedTimeToUtc(parseISO(datetime), payload.timezone);
    payload.zonedDatetime = utcToZonedTime(payload.utcDatetime, payload.timezone);
  };
</script>

<div class="cols">
  <div class="col">
    <div class="rows">
      <div class="col bg">
        <p>With defaults</p>
        <Picker on:update="{update}" />
      </div>
      <div class="col bg">
        <p>With timezone</p>
        <Picker on:update="{update}" timezone="Europe/London" />
      </div>
      <div class="col bg">
        <p>With timezone and list of allowed timezones</p>
        <Picker on:update="{update}" timezone="Asia/Istanbul" {allowedTimezones} />
      </div>
    </div>
  </div>
  <div class="col bg">
  <p>{parseISO(datetime)}</p>
  {#if Object.keys(payload).length}
    <pre>{JSON.stringify(payload, null, 2)}</pre>
    <p>
      Local time: {format(payload.zonedDatetime, "MMMM do, yyyy', ' HH:mm aaaa")} in {payload.timezone}.
    </p>
    <p>UTC: {format(payload.utcDatetime, "MMMM do, yyyy 'at' HH:mm aaaa")}</p>
  {/if}
  </div>
</div>

<style>
  .cols {
    background: #fafafa;
    border: 1px solid #ccc;
  }

  .cols,
  .rows {
    display: flex;
    margin: 2em 0;
  }

  .rows {
    flex-direction: column;
  }

  .col {
    margin: 0.4em 0;
    padding: 1em;
  }

  .bg {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  p {
    color: #9c9c9c;
    font-size: 0.8em;
  }

  pre {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 2px;
    padding: 0.4em;
  }
</style>
