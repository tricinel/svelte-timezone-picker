
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var SvelteTimezonePicker = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.25.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    const timezones = {
      Africa: {
        'Africa/Abidjan': ['Abidjan', '+00:00', '+00:00'],
        'Africa/Accra': ['Accra', '+00:00', '+00:00'],
        'Africa/Addis_Ababa': ['Addis Ababa', '+03:00', '+03:00'],
        'Africa/Algiers': ['Algiers', '+01:00', '+01:00'],
        'Africa/Asmara': ['Asmara', '+03:00', '+03:00'],
        'Africa/Asmera': ['Asmera', '+03:00', '+03:00'],
        'Africa/Bamako': ['Bamako', '+00:00', '+00:00'],
        'Africa/Bangui': ['Bangui', '+01:00', '+01:00'],
        'Africa/Banjul': ['Banjul', '+00:00', '+00:00'],
        'Africa/Bissau': ['Bissau', '+00:00', '+00:00'],
        'Africa/Blantyre': ['Blantyre', '+02:00', '+02:00'],
        'Africa/Brazzaville': ['Brazzaville', '+01:00', '+01:00'],
        'Africa/Bujumbura': ['Bujumbura', '+02:00', '+02:00'],
        'Africa/Cairo': ['Cairo', '+02:00', '+03:00'],
        'Africa/Casablanca': ['Casablanca', '+00:00', '+01:00'],
        'Africa/Ceuta': ['Ceuta', '+01:00', '+02:00'],
        'Africa/Conakry': ['Conakry', '+00:00', '+00:00'],
        'Africa/Dakar': ['Dakar', '+00:00', '+00:00'],
        'Africa/Dar_es_Salaam': ['Dar es_Salaam', '+03:00', '+03:00'],
        'Africa/Djibouti': ['Djibouti', '+03:00', '+03:00'],
        'Africa/Douala': ['Douala', '+01:00', '+01:00'],
        'Africa/El_Aaiun': ['El Aaiun', '+00:00', '+01:00'],
        'Africa/Freetown': ['Freetown', '+00:00', '+00:00'],
        'Africa/Gaborone': ['Gaborone', '+02:00', '+02:00'],
        'Africa/Harare': ['Harare', '+02:00', '+02:00'],
        'Africa/Johannesburg': ['Johannesburg', '+02:00', '+02:00'],
        'Africa/Juba': ['Juba', '+03:00', '+03:00'],
        'Africa/Kampala': ['Kampala', '+03:00', '+03:00'],
        'Africa/Khartoum': ['Khartoum', '+03:00', '+03:00'],
        'Africa/Kigali': ['Kigali', '+02:00', '+02:00'],
        'Africa/Kinshasa': ['Kinshasa', '+01:00', '+01:00'],
        'Africa/Lagos': ['Lagos', '+01:00', '+01:00'],
        'Africa/Libreville': ['Libreville', '+01:00', '+01:00'],
        'Africa/Lome': ['Lome', '+00:00', '+00:00'],
        'Africa/Luanda': ['Luanda', '+01:00', '+01:00'],
        'Africa/Lubumbashi': ['Lubumbashi', '+02:00', '+02:00'],
        'Africa/Lusaka': ['Lusaka', '+02:00', '+02:00'],
        'Africa/Malabo': ['Malabo', '+01:00', '+01:00'],
        'Africa/Maputo': ['Maputo', '+02:00', '+02:00'],
        'Africa/Maseru': ['Maseru', '+02:00', '+02:00'],
        'Africa/Mbabane': ['Mbabane', '+02:00', '+02:00'],
        'Africa/Mogadishu': ['Mogadishu', '+03:00', '+03:00'],
        'Africa/Monrovia': ['Monrovia', '+00:00', '+00:00'],
        'Africa/Nairobi': ['Nairobi', '+03:00', '+03:00'],
        'Africa/Ndjamena': ['Ndjamena', '+01:00', '+01:00'],
        'Africa/Niamey': ['Niamey', '+01:00', '+01:00'],
        'Africa/Nouakchott': ['Nouakchott', '+00:00', '+00:00'],
        'Africa/Ouagadougou': ['Ouagadougou', '+00:00', '+00:00'],
        'Africa/Porto-Novo': ['Porto-Novo', '+01:00', '+01:00'],
        'Africa/Sao_Tome': ['Sao Tome', '+00:00', '+00:00'],
        'Africa/Timbuktu': ['Timbuktu', '+00:00', '+00:00'],
        'Africa/Tripoli': ['Tripoli', '+01:00', '+02:00'],
        'Africa/Tunis': ['Tunis', '+01:00', '+01:00'],
        'Africa/Windhoek': ['Windhoek', '+01:00', '+02:00']
      },
      America: {
        'America/Adak': ['Adak', '-10:00', '-09:00'],
        'America/Anchorage': ['Anchorage', '-09:00', '-08:00'],
        'America/Anguilla': ['Anguilla', '-04:00', '-04:00'],
        'America/Antigua': ['Antigua', '-04:00', '-04:00'],
        'America/Araguaina': ['Araguaina', '-03:00', '-03:00'],
        'America/Argentina/Buenos_Aires': [
          'Buenos Aires, Argentina',
          '-03:00',
          '-03:00'
        ],
        'America/Argentina/Catamarca': ['Catamarca, Argentina', '-03:00', '-03:00'],
        'America/Argentina/ComodRivadavia': [
          'ComodRivadavia, Argentina',
          '-03:00',
          '-03:00'
        ],
        'America/Argentina/Cordoba': ['Cordoba, Argentina', '-03:00', '-03:00'],
        'America/Argentina/Jujuy': ['Jujuy, Argentina', '-03:00', '-03:00'],
        'America/Argentina/La_Rioja': ['La Rioja, Argentina', '-03:00', '-03:00'],
        'America/Argentina/Mendoza': ['Mendoza, Argentina', '-03:00', '-03:00'],
        'America/Argentina/Rio_Gallegos': [
          'Rio Gallegos, Argentina',
          '-03:00',
          '-03:00'
        ],
        'America/Argentina/Salta': ['Salta, Argentina', '-03:00', '-03:00'],
        'America/Argentina/San_Juan': ['San Juan, Argentina', '-03:00', '-03:00'],
        'America/Argentina/San_Luis': ['San Luis, Argentina', '-03:00', '-03:00'],
        'America/Argentina/Tucuman': ['Tucuman, Argentina', '-03:00', '-03:00'],
        'America/Argentina/Ushuaia': ['Ushuaia, Argentina', '-03:00', '-03:00'],
        'America/Aruba': ['Aruba', '-04:00', '-04:00'],
        'America/Asuncion': ['Asuncion', '-04:00', '-03:00'],
        'America/Atikokan': ['Atikokan', '-05:00', '-05:00'],
        'America/Atka': ['Atka', '-10:00', '-09:00'],
        'America/Bahia': ['Bahia', '-03:00', '-02:00'],
        'America/Bahia_Banderas': ['Bahia Banderas', '-06:00', '-05:00'],
        'America/Barbados': ['Barbados', '-04:00', '-04:00'],
        'America/Belem': ['Belem', '-03:00', '-03:00'],
        'America/Belize': ['Belize', '-06:00', '-06:00'],
        'America/Blanc-Sablon': ['Blanc-Sablon', '-04:00', '-04:00'],
        'America/Boa_Vista': ['Boa Vista', '-04:00', '-04:00'],
        'America/Bogota': ['Bogota', '-05:00', '-05:00'],
        'America/Boise': ['Boise', '-07:00', '-06:00'],
        'America/Buenos_Aires': ['Buenos Aires', '-03:00', '-03:00'],
        'America/Cambridge_Bay': ['Cambridge Bay', '-07:00', '-06:00'],
        'America/Campo_Grande': ['Campo Grande', '-04:00', '-03:00'],
        'America/Cancun': ['Cancun', '-06:00', '-05:00'],
        'America/Caracas': ['Caracas', '-04:30', '-04:30'],
        'America/Catamarca': ['Catamarca', '-03:00', '-03:00'],
        'America/Cayenne': ['Cayenne', '-03:00', '-03:00'],
        'America/Cayman': ['Cayman', '-05:00', '-05:00'],
        'America/Chicago': ['Chicago', '-06:00', '-05:00'],
        'America/Chihuahua': ['Chihuahua', '-07:00', '-06:00'],
        'America/Coral_Harbour': ['Coral Harbour', '-05:00', '-05:00'],
        'America/Cordoba': ['Cordoba', '-03:00', '-03:00'],
        'America/Costa_Rica': ['Costa Rica', '-06:00', '-06:00'],
        'America/Creston': ['Creston', '-07:00', '-07:00'],
        'America/Cuiaba': ['Cuiaba', '-04:00', '-03:00'],
        'America/Curacao': ['Curacao', '-04:00', '-04:00'],
        'America/Danmarkshavn': ['Danmarkshavn', '+00:00', '+00:00'],
        'America/Dawson': ['Dawson', '-08:00', '-07:00'],
        'America/Dawson_Creek': ['Dawson Creek', '-07:00', '-07:00'],
        'America/Denver': ['Denver', '-07:00', '-06:00'],
        'America/Detroit': ['Detroit', '-05:00', '-04:00'],
        'America/Dominica': ['Dominica', '-04:00', '-04:00'],
        'America/Edmonton': ['Edmonton', '-07:00', '-06:00'],
        'America/Eirunepe': ['Eirunepe', '-05:00', '-05:00'],
        'America/El_Salvador': ['El Salvador', '-06:00', '-06:00'],
        'America/Ensenada': ['Ensenada', '-08:00', '-07:00'],
        'America/Fort_Wayne': ['Fort Wayne', '-05:00', '-04:00'],
        'America/Fortaleza': ['Fortaleza', '-03:00', '-03:00'],
        'America/Glace_Bay': ['Glace Bay', '-04:00', '-03:00'],
        'America/Godthab': ['Godthab', '-03:00', '-02:00'],
        'America/Goose_Bay': ['Goose Bay', '-04:00', '-03:00'],
        'America/Grand_Turk': ['Grand Turk', '-05:00', '-04:00'],
        'America/Grenada': ['Grenada', '-04:00', '-04:00'],
        'America/Guadeloupe': ['Guadeloupe', '-04:00', '-04:00'],
        'America/Guatemala': ['Guatemala', '-06:00', '-06:00'],
        'America/Guayaquil': ['Guayaquil', '-05:00', '-05:00'],
        'America/Guyana': ['Guyana', '-04:00', '-04:00'],
        'America/Halifax': ['Halifax', '-04:00', '-03:00'],
        'America/Havana': ['Havana', '-05:00', '-04:00'],
        'America/Hermosillo': ['Hermosillo', '-07:00', '-07:00'],
        'America/Indiana/Indianapolis': [
          'Indianapolis, Indiana',
          '-05:00',
          '-04:00'
        ],
        'America/Indiana/Knox': ['Knox, Indiana', '-06:00', '-05:00'],
        'America/Indiana/Marengo': ['Marengo, Indiana', '-05:00', '-04:00'],
        'America/Indiana/Petersburg': ['Petersburg, Indiana', '-05:00', '-04:00'],
        'America/Indiana/Tell_City': ['Tell City, Indiana', '-06:00', '-05:00'],
        'America/Indiana/Valparaiso': ['Valparaiso, Indiana', '-06:00', '-05:00'],
        'America/Indiana/Vevay': ['Vevay, Indiana', '-05:00', '-04:00'],
        'America/Indiana/Vincennes': ['Vincennes, Indiana', '-05:00', '-04:00'],
        'America/Indiana/Winamac': ['Winamac, Indiana', '-05:00', '-04:00'],
        'America/Indianapolis': ['Indianapolis', '-05:00', '-04:00'],
        'America/Inuvik': ['Inuvik', '-07:00', '-06:00'],
        'America/Iqaluit': ['Iqaluit', '-05:00', '-04:00'],
        'America/Jamaica': ['Jamaica', '-05:00', '-05:00'],
        'America/Jujuy': ['Jujuy', '-03:00', '-03:00'],
        'America/Juneau': ['Juneau', '-09:00', '-08:00'],
        'America/Kentucky/Louisville': ['Louisville, Kentucky', '-05:00', '-04:00'],
        'America/Kentucky/Monticello': ['Monticello, Kentucky', '-05:00', '-04:00'],
        'America/Knox_IN': ['Knox IN', '-06:00', '-05:00'],
        'America/Kralendijk': ['Kralendijk', '-04:00', '-04:00'],
        'America/La_Paz': ['La Paz', '-04:00', '-04:00'],
        'America/Lima': ['Lima', '-05:00', '-05:00'],
        'America/Los_Angeles': ['Los Angeles', '-08:00', '-07:00'],
        'America/Louisville': ['Louisville', '-05:00', '-04:00'],
        'America/Lower_Princes': ['Lower Princes', '-04:00', '-04:00'],
        'America/Maceio': ['Maceio', '-03:00', '-03:00'],
        'America/Managua': ['Managua', '-06:00', '-06:00'],
        'America/Manaus': ['Manaus', '-04:00', '-04:00'],
        'America/Marigot': ['Marigot', '-04:00', '-04:00'],
        'America/Martinique': ['Martinique', '-04:00', '-04:00'],
        'America/Matamoros': ['Matamoros', '-06:00', '-05:00'],
        'America/Mazatlan': ['Mazatlan', '-07:00', '-06:00'],
        'America/Mendoza': ['Mendoza', '-03:00', '-03:00'],
        'America/Menominee': ['Menominee', '-06:00', '-05:00'],
        'America/Merida': ['Merida', '-06:00', '-05:00'],
        'America/Metlakatla': ['Metlakatla', '-08:00', '-08:00'],
        'America/Mexico_City': ['Mexico City', '-06:00', '-05:00'],
        'America/Miquelon': ['Miquelon', '-03:00', '-02:00'],
        'America/Moncton': ['Moncton', '-04:00', '-03:00'],
        'America/Monterrey': ['Monterrey', '-06:00', '-05:00'],
        'America/Montevideo': ['Montevideo', '-03:00', '-02:00'],
        'America/Montreal': ['Montreal', '-05:00', '-04:00'],
        'America/Montserrat': ['Montserrat', '-04:00', '-04:00'],
        'America/Nassau': ['Nassau', '-05:00', '-04:00'],
        'America/New_York': ['New York', '-05:00', '-04:00'],
        'America/Nipigon': ['Nipigon', '-05:00', '-04:00'],
        'America/Nome': ['Nome', '-09:00', '-08:00'],
        'America/Noronha': ['Noronha', '-02:00', '-02:00'],
        'America/North_Dakota/Beulah': ['Beulah, North Dakota', '-06:00', '-05:00'],
        'America/North_Dakota/Center': ['Center, North Dakota', '-06:00', '-05:00'],
        'America/North_Dakota/New_Salem': [
          'New Salem, North Dakota',
          '-06:00',
          '-05:00'
        ],
        'America/Ojinaga': ['Ojinaga', '-07:00', '-06:00'],
        'America/Panama': ['Panama', '-05:00', '-05:00'],
        'America/Pangnirtung': ['Pangnirtung', '-05:00', '-04:00'],
        'America/Paramaribo': ['Paramaribo', '-03:00', '-03:00'],
        'America/Phoenix': ['Phoenix', '-07:00', '-07:00'],
        'America/Port-au-Prince': ['Port-au-Prince', '-05:00', '-04:00'],
        'America/Port_of_Spain': ['Port of_Spain', '-04:00', '-04:00'],
        'America/Porto_Acre': ['Porto Acre', '-05:00', '-05:00'],
        'America/Porto_Velho': ['Porto Velho', '-04:00', '-04:00'],
        'America/Puerto_Rico': ['Puerto Rico', '-04:00', '-04:00'],
        'America/Rainy_River': ['Rainy River', '-06:00', '-05:00'],
        'America/Rankin_Inlet': ['Rankin Inlet', '-06:00', '-05:00'],
        'America/Recife': ['Recife', '-03:00', '-03:00'],
        'America/Regina': ['Regina', '-06:00', '-06:00'],
        'America/Resolute': ['Resolute', '-06:00', '-05:00'],
        'America/Rio_Branco': ['Rio Branco', '-05:00', '-05:00'],
        'America/Rosario': ['Rosario', '-03:00', '-03:00'],
        'America/Santa_Isabel': ['Santa Isabel', '-08:00', '-07:00'],
        'America/Santarem': ['Santarem', '-03:00', '-03:00'],
        'America/Santiago': ['Santiago', '-04:00', '-03:00'],
        'America/Santo_Domingo': ['Santo Domingo', '-04:00', '-04:00'],
        'America/Sao_Paulo': ['Sao Paulo', '-03:00', '-02:00'],
        'America/Scoresbysund': ['Scoresbysund', '-01:00', '+00:00'],
        'America/Shiprock': ['Shiprock', '-07:00', '-06:00'],
        'America/Sitka': ['Sitka', '-09:00', '-08:00'],
        'America/St_Barthelemy': ['St Barthelemy', '-04:00', '-04:00'],
        'America/St_Johns': ['St Johns', '-03:30', '-02:30'],
        'America/St_Kitts': ['St Kitts', '-04:00', '-04:00'],
        'America/St_Lucia': ['St Lucia', '-04:00', '-04:00'],
        'America/St_Thomas': ['St Thomas', '-04:00', '-04:00'],
        'America/St_Vincent': ['St Vincent', '-04:00', '-04:00'],
        'America/Swift_Current': ['Swift Current', '-06:00', '-06:00'],
        'America/Tegucigalpa': ['Tegucigalpa', '-06:00', '-06:00'],
        'America/Thule': ['Thule', '-04:00', '-03:00'],
        'America/Thunder_Bay': ['Thunder Bay', '-05:00', '-04:00'],
        'America/Tijuana': ['Tijuana', '-08:00', '-07:00'],
        'America/Toronto': ['Toronto', '-05:00', '-04:00'],
        'America/Tortola': ['Tortola', '-04:00', '-04:00'],
        'America/Vancouver': ['Vancouver', '-08:00', '-07:00'],
        'America/Virgin': ['Virgin', '-04:00', '-04:00'],
        'America/Whitehorse': ['Whitehorse', '-08:00', '-07:00'],
        'America/Winnipeg': ['Winnipeg', '-06:00', '-05:00'],
        'America/Yakutat': ['Yakutat', '-09:00', '-08:00'],
        'America/Yellowknife': ['Yellowknife', '-07:00', '-06:00']
      },
      Antarctica: {
        'Antarctica/Casey': ['Casey', '+11:00', '+08:00'],
        'Antarctica/Davis': ['Davis', '+05:00', '+07:00'],
        'Antarctica/DumontDUrville': ['DumontDUrville', '+10:00', '+10:00'],
        'Antarctica/Macquarie': ['Macquarie', '+11:00', '+11:00'],
        'Antarctica/Mawson': ['Mawson', '+05:00', '+05:00'],
        'Antarctica/McMurdo': ['McMurdo', '+12:00', '+13:00'],
        'Antarctica/Palmer': ['Palmer', '-04:00', '-03:00'],
        'Antarctica/Rothera': ['Rothera', '-03:00', '-03:00'],
        'Antarctica/South_Pole': ['South Pole', '+12:00', '+13:00'],
        'Antarctica/Syowa': ['Syowa', '+03:00', '+03:00'],
        'Antarctica/Troll': ['Troll', '+00:00', '+02:00'],
        'Antarctica/Vostok': ['Vostok', '+06:00', '+06:00']
      },
      Arctic: { 'Arctic/Longyearbyen': ['Longyearbyen', '+01:00', '+02:00'] },
      Asia: {
        'Asia/Aden': ['Aden', '+03:00', '+03:00'],
        'Asia/Almaty': ['Almaty', '+06:00', '+06:00'],
        'Asia/Amman': ['Amman', '+02:00', '+03:00'],
        'Asia/Anadyr': ['Anadyr', '+12:00', '+12:00'],
        'Asia/Aqtau': ['Aqtau', '+05:00', '+05:00'],
        'Asia/Aqtobe': ['Aqtobe', '+05:00', '+05:00'],
        'Asia/Ashgabat': ['Ashgabat', '+05:00', '+05:00'],
        'Asia/Ashkhabad': ['Ashkhabad', '+05:00', '+05:00'],
        'Asia/Baghdad': ['Baghdad', '+03:00', '+03:00'],
        'Asia/Bahrain': ['Bahrain', '+03:00', '+03:00'],
        'Asia/Baku': ['Baku', '+04:00', '+05:00'],
        'Asia/Bangkok': ['Bangkok', '+07:00', '+07:00'],
        'Asia/Beirut': ['Beirut', '+02:00', '+03:00'],
        'Asia/Bishkek': ['Bishkek', '+06:00', '+06:00'],
        'Asia/Brunei': ['Brunei', '+08:00', '+08:00'],
        'Asia/Calcutta': ['Calcutta', '+05:30', '+05:30'],
        'Asia/Choibalsan': ['Choibalsan', '+08:00', '+08:00'],
        'Asia/Chongqing': ['Chongqing', '+08:00', '+08:00'],
        'Asia/Chungking': ['Chungking', '+08:00', '+08:00'],
        'Asia/Colombo': ['Colombo', '+05:30', '+05:30'],
        'Asia/Dacca': ['Dacca', '+06:00', '+06:00'],
        'Asia/Damascus': ['Damascus', '+02:00', '+03:00'],
        'Asia/Dhaka': ['Dhaka', '+06:00', '+06:00'],
        'Asia/Dili': ['Dili', '+09:00', '+09:00'],
        'Asia/Dubai': ['Dubai', '+04:00', '+04:00'],
        'Asia/Dushanbe': ['Dushanbe', '+05:00', '+05:00'],
        'Asia/Gaza': ['Gaza', '+02:00', '+03:00'],
        'Asia/Harbin': ['Harbin', '+08:00', '+08:00'],
        'Asia/Hebron': ['Hebron', '+02:00', '+03:00'],
        'Asia/Ho_Chi_Minh': ['Ho Chi_Minh', '+07:00', '+07:00'],
        'Asia/Hong_Kong': ['Hong Kong', '+08:00', '+08:00'],
        'Asia/Hovd': ['Hovd', '+07:00', '+07:00'],
        'Asia/Irkutsk': ['Irkutsk', '+08:00', '+08:00'],
        'Asia/Istanbul': ['Istanbul', '+02:00', '+03:00'],
        'Asia/Jakarta': ['Jakarta', '+07:00', '+07:00'],
        'Asia/Jayapura': ['Jayapura', '+09:00', '+09:00'],
        'Asia/Jerusalem': ['Jerusalem', '+02:00', '+03:00'],
        'Asia/Kabul': ['Kabul', '+04:30', '+04:30'],
        'Asia/Kamchatka': ['Kamchatka', '+12:00', '+12:00'],
        'Asia/Karachi': ['Karachi', '+05:00', '+05:00'],
        'Asia/Kashgar': ['Kashgar', '+08:00', '+08:00'],
        'Asia/Kathmandu': ['Kathmandu', '+05:45', '+05:45'],
        'Asia/Katmandu': ['Katmandu', '+05:45', '+05:45'],
        'Asia/Khandyga': ['Khandyga', '+09:00', '+09:00'],
        'Asia/Kolkata': ['Kolkata', '+05:30', '+05:30'],
        'Asia/Krasnoyarsk': ['Krasnoyarsk', '+07:00', '+07:00'],
        'Asia/Kuala_Lumpur': ['Kuala Lumpur', '+08:00', '+08:00'],
        'Asia/Kuching': ['Kuching', '+08:00', '+08:00'],
        'Asia/Kuwait': ['Kuwait', '+03:00', '+03:00'],
        'Asia/Macao': ['Macao', '+08:00', '+08:00'],
        'Asia/Macau': ['Macau', '+08:00', '+08:00'],
        'Asia/Magadan': ['Magadan', '+10:00', '+10:00'],
        'Asia/Makassar': ['Makassar', '+08:00', '+08:00'],
        'Asia/Manila': ['Manila', '+08:00', '+08:00'],
        'Asia/Muscat': ['Muscat', '+04:00', '+04:00'],
        'Asia/Nicosia': ['Nicosia', '+02:00', '+03:00'],
        'Asia/Novokuznetsk': ['Novokuznetsk', '+07:00', '+07:00'],
        'Asia/Novosibirsk': ['Novosibirsk', '+06:00', '+06:00'],
        'Asia/Omsk': ['Omsk', '+06:00', '+06:00'],
        'Asia/Oral': ['Oral', '+05:00', '+05:00'],
        'Asia/Phnom_Penh': ['Phnom Penh', '+07:00', '+07:00'],
        'Asia/Pontianak': ['Pontianak', '+07:00', '+07:00'],
        'Asia/Pyongyang': ['Pyongyang', '+09:00', '+09:00'],
        'Asia/Qatar': ['Qatar', '+03:00', '+03:00'],
        'Asia/Qyzylorda': ['Qyzylorda', '+06:00', '+06:00'],
        'Asia/Rangoon': ['Rangoon', '+06:30', '+06:30'],
        'Asia/Riyadh': ['Riyadh', '+03:00', '+03:00'],
        'Asia/Saigon': ['Saigon', '+07:00', '+07:00'],
        'Asia/Sakhalin': ['Sakhalin', '+11:00', '+11:00'],
        'Asia/Samarkand': ['Samarkand', '+05:00', '+05:00'],
        'Asia/Seoul': ['Seoul', '+09:00', '+09:00'],
        'Asia/Shanghai': ['Shanghai', '+08:00', '+08:00'],
        'Asia/Singapore': ['Singapore', '+08:00', '+08:00'],
        'Asia/Taipei': ['Taipei', '+08:00', '+08:00'],
        'Asia/Tashkent': ['Tashkent', '+05:00', '+05:00'],
        'Asia/Tbilisi': ['Tbilisi', '+04:00', '+04:00'],
        'Asia/Tehran': ['Tehran', '+03:30', '+04:30'],
        'Asia/Tel_Aviv': ['Tel Aviv', '+02:00', '+03:00'],
        'Asia/Thimbu': ['Thimbu', '+06:00', '+06:00'],
        'Asia/Thimphu': ['Thimphu', '+06:00', '+06:00'],
        'Asia/Tokyo': ['Tokyo', '+09:00', '+09:00'],
        'Asia/Ujung_Pandang': ['Ujung Pandang', '+08:00', '+08:00'],
        'Asia/Ulaanbaatar': ['Ulaanbaatar', '+08:00', '+08:00'],
        'Asia/Ulan_Bator': ['Ulan Bator', '+08:00', '+08:00'],
        'Asia/Urumqi': ['Urumqi', '+08:00', '+08:00'],
        'Asia/Ust-Nera': ['Ust-Nera', '+10:00', '+10:00'],
        'Asia/Vientiane': ['Vientiane', '+07:00', '+07:00'],
        'Asia/Vladivostok': ['Vladivostok', '+10:00', '+10:00'],
        'Asia/Yakutsk': ['Yakutsk', '+09:00', '+09:00'],
        'Asia/Yekaterinburg': ['Yekaterinburg', '+05:00', '+05:00'],
        'Asia/Yerevan': ['Yerevan', '+04:00', '+04:00']
      },
      Atlantic: {
        'Atlantic/Azores': ['Azores', '-01:00', '+00:00'],
        'Atlantic/Bermuda': ['Bermuda', '-04:00', '-03:00'],
        'Atlantic/Canary': ['Canary', '+00:00', '+01:00'],
        'Atlantic/Cape_Verde': ['Cape Verde', '-01:00', '-01:00'],
        'Atlantic/Faeroe': ['Faeroe', '+00:00', '+01:00'],
        'Atlantic/Faroe': ['Faroe', '+00:00', '+01:00'],
        'Atlantic/Jan_Mayen': ['Jan Mayen', '+01:00', '+02:00'],
        'Atlantic/Madeira': ['Madeira', '+00:00', '+01:00'],
        'Atlantic/Reykjavik': ['Reykjavik', '+00:00', '+00:00'],
        'Atlantic/South_Georgia': ['South Georgia', '-02:00', '-02:00'],
        'Atlantic/St_Helena': ['St Helena', '+00:00', '+00:00'],
        'Atlantic/Stanley': ['Stanley', '-03:00', '-03:00']
      },
      Australia: {
        'Australia/ACT': ['ACT', '+10:00', '+11:00'],
        'Australia/Adelaide': ['Adelaide', '+09:30', '+10:30'],
        'Australia/Brisbane': ['Brisbane', '+10:00', '+10:00'],
        'Australia/Broken_Hill': ['Broken Hill', '+09:30', '+10:30'],
        'Australia/Canberra': ['Canberra', '+10:00', '+11:00'],
        'Australia/Currie': ['Currie', '+10:00', '+11:00'],
        'Australia/Darwin': ['Darwin', '+09:30', '+09:30'],
        'Australia/Eucla': ['Eucla', '+08:45', '+08:45'],
        'Australia/Hobart': ['Hobart', '+10:00', '+11:00'],
        'Australia/LHI': ['LHI', '+10:30', '+11:00'],
        'Australia/Lindeman': ['Lindeman', '+10:00', '+10:00'],
        'Australia/Lord_Howe': ['Lord Howe', '+10:30', '+11:00'],
        'Australia/Melbourne': ['Melbourne', '+10:00', '+11:00'],
        'Australia/NSW': ['NSW', '+10:00', '+11:00'],
        'Australia/North': ['North', '+09:30', '+09:30'],
        'Australia/Perth': ['Perth', '+08:00', '+08:00'],
        'Australia/Queensland': ['Queensland', '+10:00', '+10:00'],
        'Australia/South': ['South', '+09:30', '+10:30'],
        'Australia/Sydney': ['Sydney', '+10:00', '+11:00'],
        'Australia/Tasmania': ['Tasmania', '+10:00', '+11:00'],
        'Australia/Victoria': ['Victoria', '+10:00', '+11:00'],
        'Australia/West': ['West', '+08:00', '+08:00'],
        'Australia/Yancowinna': ['Yancowinna', '+09:30', '+10:30']
      },
      Brazil: {
        'Brazil/Acre': ['Acre', '-05:00', '-05:00'],
        'Brazil/DeNoronha': ['DeNoronha', '-02:00', '-02:00'],
        'Brazil/East': ['East', '-03:00', '-02:00'],
        'Brazil/West': ['West', '-04:00', '-04:00']
      },
      Canada: {
        'Canada/Atlantic': ['Atlantic', '-04:00', '-03:00'],
        'Canada/Central': ['Central', '-06:00', '-05:00'],
        'Canada/East-Saskatchewan': ['East-Saskatchewan', '-06:00', '-06:00'],
        'Canada/Eastern': ['Eastern', '-05:00', '-04:00'],
        'Canada/Mountain': ['Mountain', '-07:00', '-06:00'],
        'Canada/Newfoundland': ['Newfoundland', '-03:30', '-02:30'],
        'Canada/Pacific': ['Pacific', '-08:00', '-07:00'],
        'Canada/Saskatchewan': ['Saskatchewan', '-06:00', '-06:00'],
        'Canada/Yukon': ['Yukon', '-08:00', '-07:00']
      },
      Chile: {
        'Chile/Continental': ['Continental', '-04:00', '-03:00'],
        'Chile/EasterIsland': ['EasterIsland', '-06:00', '-05:00']
      },
      Other: {
        Cuba: ['Cuba', '-05:00', '-04:00'],
        Egypt: ['Egypt', '+02:00', '+02:00'],
        Eire: ['Eire', '+00:00', '+01:00'],
        GB: ['GB', '+00:00', '+01:00'],
        'GB-Eire': ['GB-Eire', '+00:00', '+01:00'],
        GMT: ['GMT', '+00:00', '+00:00'],
        'GMT+0': ['GMT+0', '+00:00', '+00:00'],
        'GMT-0': ['GMT-0', '+00:00', '+00:00'],
        GMT0: ['GMT0', '+00:00', '+00:00'],
        Greenwich: ['Greenwich', '+00:00', '+00:00'],
        Hongkong: ['Hongkong', '+08:00', '+08:00'],
        Iceland: ['Iceland', '+00:00', '+00:00'],
        Iran: ['Iran', '+03:30', '+04:30'],
        Israel: ['Israel', '+02:00', '+03:00'],
        Jamaica: ['Jamaica', '-05:00', '-05:00'],
        Japan: ['Japan', '+09:00', '+09:00'],
        Kwajalein: ['Kwajalein', '+12:00', '+12:00'],
        Libya: ['Libya', '+02:00', '+01:00'],
        NZ: ['NZ', '+12:00', '+13:00'],
        'NZ-CHAT': ['NZ-CHAT', '+12:45', '+13:45'],
        Navajo: ['Navajo', '-07:00', '-06:00'],
        PRC: ['PRC', '+08:00', '+08:00'],
        Poland: ['Poland', '+01:00', '+02:00'],
        Portugal: ['Portugal', '+00:00', '+01:00'],
        ROC: ['ROC', '+08:00', '+08:00'],
        ROK: ['ROK', '+09:00', '+09:00'],
        Singapore: ['Singapore', '+08:00', '+08:00'],
        Turkey: ['Turkey', '+02:00', '+03:00'],
        UCT: ['UCT', '+00:00', '+00:00'],
        UTC: ['UTC', '+00:00', '+00:00'],
        Universal: ['Universal', '+00:00', '+00:00'],
        'W-SU': ['W-SU', '+03:00', '+03:00'],
        Zulu: ['Zulu', '+00:00', '+00:00']
      },
      Etc: {
        'Etc/GMT': ['GMT', '+00:00', '+00:00'],
        'Etc/GMT+0': ['GMT+0', '+00:00', '+00:00'],
        'Etc/UCT': ['UCT', '+00:00', '+00:00'],
        'Etc/UTC': ['UTC', '+00:00', '+00:00'],
        'Etc/Universal': ['Universal', '+00:00', '+00:00'],
        'Etc/Zulu': ['Zulu', '+00:00', '+00:00']
      },
      Europe: {
        'Europe/Amsterdam': ['Amsterdam', '+01:00', '+02:00'],
        'Europe/Andorra': ['Andorra', '+01:00', '+02:00'],
        'Europe/Athens': ['Athens', '+02:00', '+03:00'],
        'Europe/Belfast': ['Belfast', '+00:00', '+01:00'],
        'Europe/Belgrade': ['Belgrade', '+01:00', '+02:00'],
        'Europe/Berlin': ['Berlin', '+01:00', '+02:00'],
        'Europe/Bratislava': ['Bratislava', '+01:00', '+02:00'],
        'Europe/Brussels': ['Brussels', '+01:00', '+02:00'],
        'Europe/Bucharest': ['Bucharest', '+02:00', '+03:00'],
        'Europe/Budapest': ['Budapest', '+01:00', '+02:00'],
        'Europe/Busingen': ['Busingen', '+01:00', '+02:00'],
        'Europe/Chisinau': ['Chisinau', '+02:00', '+03:00'],
        'Europe/Copenhagen': ['Copenhagen', '+01:00', '+02:00'],
        'Europe/Dublin': ['Dublin', '+00:00', '+01:00'],
        'Europe/Gibraltar': ['Gibraltar', '+01:00', '+02:00'],
        'Europe/Guernsey': ['Guernsey', '+00:00', '+01:00'],
        'Europe/Helsinki': ['Helsinki', '+02:00', '+03:00'],
        'Europe/Isle_of_Man': ['Isle of_Man', '+00:00', '+01:00'],
        'Europe/Istanbul': ['Istanbul', '+02:00', '+03:00'],
        'Europe/Jersey': ['Jersey', '+00:00', '+01:00'],
        'Europe/Kaliningrad': ['Kaliningrad', '+02:00', '+02:00'],
        'Europe/Kiev': ['Kiev', '+02:00', '+03:00'],
        'Europe/Lisbon': ['Lisbon', '+00:00', '+01:00'],
        'Europe/Ljubljana': ['Ljubljana', '+01:00', '+02:00'],
        'Europe/London': ['London', '+00:00', '+01:00'],
        'Europe/Luxembourg': ['Luxembourg', '+01:00', '+02:00'],
        'Europe/Madrid': ['Madrid', '+01:00', '+02:00'],
        'Europe/Malta': ['Malta', '+01:00', '+02:00'],
        'Europe/Mariehamn': ['Mariehamn', '+02:00', '+03:00'],
        'Europe/Minsk': ['Minsk', '+03:00', '+03:00'],
        'Europe/Monaco': ['Monaco', '+01:00', '+02:00'],
        'Europe/Moscow': ['Moscow', '+03:00', '+03:00'],
        'Europe/Nicosia': ['Nicosia', '+02:00', '+03:00'],
        'Europe/Oslo': ['Oslo', '+01:00', '+02:00'],
        'Europe/Paris': ['Paris', '+01:00', '+02:00'],
        'Europe/Podgorica': ['Podgorica', '+01:00', '+02:00'],
        'Europe/Prague': ['Prague', '+01:00', '+02:00'],
        'Europe/Riga': ['Riga', '+02:00', '+03:00'],
        'Europe/Rome': ['Rome', '+01:00', '+02:00'],
        'Europe/Samara': ['Samara', '+04:00', '+04:00'],
        'Europe/San_Marino': ['San Marino', '+01:00', '+02:00'],
        'Europe/Sarajevo': ['Sarajevo', '+01:00', '+02:00'],
        'Europe/Simferopol': ['Simferopol', '+03:00', '+03:00'],
        'Europe/Skopje': ['Skopje', '+01:00', '+02:00'],
        'Europe/Sofia': ['Sofia', '+02:00', '+03:00'],
        'Europe/Stockholm': ['Stockholm', '+01:00', '+02:00'],
        'Europe/Tallinn': ['Tallinn', '+02:00', '+03:00'],
        'Europe/Tirane': ['Tirane', '+01:00', '+02:00'],
        'Europe/Tiraspol': ['Tiraspol', '+02:00', '+03:00'],
        'Europe/Uzhgorod': ['Uzhgorod', '+02:00', '+03:00'],
        'Europe/Vaduz': ['Vaduz', '+01:00', '+02:00'],
        'Europe/Vatican': ['Vatican', '+01:00', '+02:00'],
        'Europe/Vienna': ['Vienna', '+01:00', '+02:00'],
        'Europe/Vilnius': ['Vilnius', '+02:00', '+03:00'],
        'Europe/Volgograd': ['Volgograd', '+03:00', '+03:00'],
        'Europe/Warsaw': ['Warsaw', '+01:00', '+02:00'],
        'Europe/Zagreb': ['Zagreb', '+01:00', '+02:00'],
        'Europe/Zaporozhye': ['Zaporozhye', '+02:00', '+03:00'],
        'Europe/Zurich': ['Zurich', '+01:00', '+02:00']
      },
      Indian: {
        'Indian/Antananarivo': ['Antananarivo', '+03:00', '+03:00'],
        'Indian/Chagos': ['Chagos', '+06:00', '+06:00'],
        'Indian/Christmas': ['Christmas', '+07:00', '+07:00'],
        'Indian/Cocos': ['Cocos', '+06:30', '+06:30'],
        'Indian/Comoro': ['Comoro', '+03:00', '+03:00'],
        'Indian/Kerguelen': ['Kerguelen', '+05:00', '+05:00'],
        'Indian/Mahe': ['Mahe', '+04:00', '+04:00'],
        'Indian/Maldives': ['Maldives', '+05:00', '+05:00'],
        'Indian/Mauritius': ['Mauritius', '+04:00', '+04:00'],
        'Indian/Mayotte': ['Mayotte', '+03:00', '+03:00'],
        'Indian/Reunion': ['Reunion', '+04:00', '+04:00']
      },
      Mexico: {
        'Mexico/BajaNorte': ['BajaNorte', '-08:00', '-07:00'],
        'Mexico/BajaSur': ['BajaSur', '-07:00', '-06:00'],
        'Mexico/General': ['General', '-06:00', '-05:00']
      },
      Pacific: {
        'Pacific/Apia': ['Apia', '+13:00', '+14:00'],
        'Pacific/Auckland': ['Auckland', '+12:00', '+13:00'],
        'Pacific/Chatham': ['Chatham', '+12:45', '+13:45'],
        'Pacific/Chuuk': ['Chuuk', '+10:00', '+10:00'],
        'Pacific/Easter': ['Easter', '-06:00', '-05:00'],
        'Pacific/Efate': ['Efate', '+11:00', '+11:00'],
        'Pacific/Enderbury': ['Enderbury', '+13:00', '+13:00'],
        'Pacific/Fakaofo': ['Fakaofo', '+13:00', '+13:00'],
        'Pacific/Fiji': ['Fiji', '+12:00', '+13:00'],
        'Pacific/Funafuti': ['Funafuti', '+12:00', '+12:00'],
        'Pacific/Galapagos': ['Galapagos', '-06:00', '-06:00'],
        'Pacific/Gambier': ['Gambier', '-09:00', '-09:00'],
        'Pacific/Guadalcanal': ['Guadalcanal', '+11:00', '+11:00'],
        'Pacific/Guam': ['Guam', '+10:00', '+10:00'],
        'Pacific/Honolulu': ['Honolulu', '-10:00', '-10:00'],
        'Pacific/Johnston': ['Johnston', '-10:00', '-10:00'],
        'Pacific/Kiritimati': ['Kiritimati', '+14:00', '+14:00'],
        'Pacific/Kosrae': ['Kosrae', '+11:00', '+11:00'],
        'Pacific/Kwajalein': ['Kwajalein', '+12:00', '+12:00'],
        'Pacific/Majuro': ['Majuro', '+12:00', '+12:00'],
        'Pacific/Marquesas': ['Marquesas', '-09:30', '-09:30'],
        'Pacific/Midway': ['Midway', '-11:00', '-11:00'],
        'Pacific/Nauru': ['Nauru', '+12:00', '+12:00'],
        'Pacific/Niue': ['Niue', '-11:00', '-11:00'],
        'Pacific/Norfolk': ['Norfolk', '+11:30', '+11:30'],
        'Pacific/Noumea': ['Noumea', '+11:00', '+11:00'],
        'Pacific/Pago_Pago': ['Pago Pago', '-11:00', '-11:00'],
        'Pacific/Palau': ['Palau', '+09:00', '+09:00'],
        'Pacific/Pitcairn': ['Pitcairn', '-08:00', '-08:00'],
        'Pacific/Pohnpei': ['Pohnpei', '+11:00', '+11:00'],
        'Pacific/Ponape': ['Ponape', '+11:00', '+11:00'],
        'Pacific/Port_Moresby': ['Port Moresby', '+10:00', '+10:00'],
        'Pacific/Rarotonga': ['Rarotonga', '-10:00', '-10:00'],
        'Pacific/Saipan': ['Saipan', '+10:00', '+10:00'],
        'Pacific/Samoa': ['Samoa', '-11:00', '-11:00'],
        'Pacific/Tahiti': ['Tahiti', '-10:00', '-10:00'],
        'Pacific/Tarawa': ['Tarawa', '+12:00', '+12:00'],
        'Pacific/Tongatapu': ['Tongatapu', '+13:00', '+13:00'],
        'Pacific/Truk': ['Truk', '+10:00', '+10:00'],
        'Pacific/Wake': ['Wake', '+12:00', '+12:00'],
        'Pacific/Wallis': ['Wallis', '+12:00', '+12:00'],
        'Pacific/Yap': ['Yap', '+10:00', '+10:00']
      },
      US: {
        'US/Alaska': ['Alaska', '-09:00', '-08:00'],
        'US/Aleutian': ['Aleutian', '-10:00', '-09:00'],
        'US/Arizona': ['Arizona', '-07:00', '-07:00'],
        'US/Central': ['Central', '-06:00', '-05:00'],
        'US/East-Indiana': ['East-Indiana', '-05:00', '-04:00'],
        'US/Eastern': ['Eastern', '-05:00', '-04:00'],
        'US/Hawaii': ['Hawaii', '-10:00', '-10:00'],
        'US/Indiana-Starke': ['Indiana-Starke', '-06:00', '-05:00'],
        'US/Michigan': ['Michigan', '-05:00', '-04:00'],
        'US/Mountain': ['Mountain', '-07:00', '-06:00'],
        'US/Pacific': ['Pacific', '-08:00', '-07:00'],
        'US/Samoa': ['Samoa', '-11:00', '-11:00']
      }
    };

    function t(t){return null!=t&&"object"==typeof t&&1===t.nodeType}function e(t,e){return (!e||"hidden"!==t)&&"visible"!==t&&"clip"!==t}function n(t,n){if(t.clientHeight<t.scrollHeight||t.clientWidth<t.scrollWidth){var r=getComputedStyle(t,null);return e(r.overflowY,n)||e(r.overflowX,n)||function(t){var e=function(t){if(!t.ownerDocument||!t.ownerDocument.defaultView)return null;try{return t.ownerDocument.defaultView.frameElement}catch(t){return null}}(t);return !!e&&(e.clientHeight<t.scrollHeight||e.clientWidth<t.scrollWidth)}(t)}return !1}function r(t,e,n,r,i,o,l,d){return o<t&&l>e||o>t&&l<e?0:o<=t&&d<=n||l>=e&&d>=n?o-t-r:l>e&&d<n||o<t&&d>n?l-e+i:0}function computeScrollIntoView(e,i){var o=window,l=i.scrollMode,d=i.block,u=i.inline,h=i.boundary,a=i.skipOverflowHiddenElements,c="function"==typeof h?h:function(t){return t!==h};if(!t(e))throw new TypeError("Invalid target");for(var f=document.scrollingElement||document.documentElement,s=[],p=e;t(p)&&c(p);){if((p=p.parentNode)===f){s.push(p);break}p===document.body&&n(p)&&!n(document.documentElement)||n(p,a)&&s.push(p);}for(var g=o.visualViewport?o.visualViewport.width:innerWidth,m=o.visualViewport?o.visualViewport.height:innerHeight,w=window.scrollX||pageXOffset,v=window.scrollY||pageYOffset,W=e.getBoundingClientRect(),b=W.height,H=W.width,y=W.top,M=W.right,E=W.bottom,V=W.left,x="start"===d||"nearest"===d?y:"end"===d?E:y+b/2,I="center"===u?V+H/2:"end"===u?M:V,C=[],T=0;T<s.length;T++){var k=s[T],B=k.getBoundingClientRect(),D=B.height,O=B.width,R=B.top,X=B.right,Y=B.bottom,L=B.left;if("if-needed"===l&&y>=0&&V>=0&&E<=m&&M<=g&&y>=R&&E<=Y&&V>=L&&M<=X)return C;var S=getComputedStyle(k),j=parseInt(S.borderLeftWidth,10),N=parseInt(S.borderTopWidth,10),q=parseInt(S.borderRightWidth,10),z=parseInt(S.borderBottomWidth,10),A=0,F=0,G="offsetWidth"in k?k.offsetWidth-k.clientWidth-j-q:0,J="offsetHeight"in k?k.offsetHeight-k.clientHeight-N-z:0;if(f===k)A="start"===d?x:"end"===d?x-m:"nearest"===d?r(v,v+m,m,N,z,v+x,v+x+b,b):x-m/2,F="start"===u?I:"center"===u?I-g/2:"end"===u?I-g:r(w,w+g,g,j,q,w+I,w+I+H,H),A=Math.max(0,A+v),F=Math.max(0,F+w);else {A="start"===d?x-R-N:"end"===d?x-Y+z+J:"nearest"===d?r(R,Y,D,N,z+J,x,x+b,b):x-(R+D/2)+J/2,F="start"===u?I-L-j:"center"===u?I-(L+O/2)+G/2:"end"===u?I-X+q+G:r(L,X,O,j,q+G,I,I+H,H);var K=k.scrollLeft,P=k.scrollTop;x+=P-(A=Math.max(0,Math.min(P+A,k.scrollHeight-D+J))),I+=K-(F=Math.max(0,Math.min(K+F,k.scrollWidth-O+G)));}C.push({el:k,top:A,left:F});}return C}

    /* eslint no-bitwise: "off" */
    /* eslint no-plusplus: "off" */

    // https://github.com/lukeed/uid/blob/master/src/index.js
    let IDX = 36;
    let HEX = '';

    while (IDX--) {
      HEX += IDX.toString(36);
    }

    // Get a unique ID
    const uid = (len) => {
      let str = '';
      let num = len || 11;

      while (num--) {
        str += HEX[(Math.random() * 36) | 0];
      }

      return str;
    };

    // Scroll an element into view if needed
    const scrollIntoView = (node, rootNode) => {
      if (node === null) {
        return;
      }

      const actions = computeScrollIntoView(node, {
        boundary: rootNode,
        block: 'center',
        scrollMode: 'if-needed'
      });

      // eslint-disable-next-line no-shadow
      actions.forEach(({ el, top }) => {
        el.scrollTop = top; // eslint-disable-line no-param-reassign
      });
    };

    // Transform a string into a slug
    const slugify = (str) =>
      str
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word [a-z0-9_], non-whitespace, non-hyphen characters
        .replace(/[\s_-]+/g, '-') // Swap any length of whitespace, underscore, hyphen characters with a single -
        .replace(/^-+|-+$/g, ''); // Remove leading, trailing -

    const keyCodes = {
      Enter: 13,
      Escape: 27,
      Space: 32,
      ArrowDown: 40,
      ArrowUp: 38,
      Backspace: 8,
      Characters: [
        48, // 0
        49, // 1
        50, // 2
        51, // 3
        52, // 4
        53, // 5
        54, // 6
        55, // 7
        56, // 8
        57, // 9
        65, // A
        66, // B
        67, // C
        68, // D
        69, // E
        70, // F
        71, // G
        72, // H
        73, // I
        74, // J
        75, // K
        76, // L
        77, // M
        78, // N
        79, // O
        80, // P
        81, // Q
        82, // R
        83, // S
        84, // T
        85, // U
        86, // V
        87, // W
        88, // X
        89, // Y
        90 // Z
      ]
    };

    const pick = (timezones, selection) => {
      const unique = Array.from(new Set([...selection]));

      return Object.keys(timezones).reduce((zones, zoneName) => {
        const picked = unique.includes(zoneName) ? timezones[zoneName] : {};
        return {
          ...zones,
          ...(Object.keys(picked).length > 0 && { [zoneName]: picked })
        };
      }, {});
    };

    // We take the grouped timezones and flatten them so that they can be easily searched
    // e.g. { Europe: { 'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } } => {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' }
    const ungroup = (timezones) =>
      Object.values(timezones).reduce(
        (values, zone) => ({ ...values, ...zone }),
        {}
      );

    // Filter the list of zone labels to only those that match a search string
    const filter = (search, zoneGroups) =>
      Object.entries(zoneGroups).reduce((zones, [zone, details]) => {
        if (details[0].toLowerCase().includes(search.toLowerCase())) {
          zones.push(zone);
        }
        return zones;
      }, []);

    /* src/Picker.svelte generated by Svelte v3.25.0 */

    const { Object: Object_1, console: console_1 } = globals;

    const file = "src/Picker.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[45] = list[i][0];
    	child_ctx[46] = list[i][1];
    	child_ctx[47] = list;
    	child_ctx[48] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	return child_ctx;
    }

    // (292:0) {#if expanded}
    function create_if_block_4(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "overlay svelte-1mifefb");
    			add_location(div, file, 292, 2, 9332);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*reset*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(292:0) {#if expanded}",
    		ctx
    	});

    	return block;
    }

    // (311:0) {#if expanded}
    function create_if_block(ctx) {
    	let div1;
    	let span;
    	let t0;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let t3;
    	let ul;
    	let ul_aria_activedescendant_value;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*userSearch*/ ctx[2] && /*userSearch*/ ctx[2].length > 0 && create_if_block_3(ctx);
    	let each_value = Object.keys(timezones);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			span = element("span");
    			t0 = text("Select a timezone from the list. Start typing to filter or use the arrow\n      keys to navigate the list");
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span, "class", "sr-only svelte-1mifefb");
    			attr_dev(span, "id", /*labelId*/ ctx[10]);
    			add_location(span, file, 317, 4, 10069);
    			attr_dev(input, "id", /*searchInputId*/ ctx[12]);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "aria-autocomplete", "list");
    			attr_dev(input, "aria-controls", /*listBoxId*/ ctx[11]);
    			attr_dev(input, "aria-labelledby", /*labelId*/ ctx[10]);
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "autocorrect", "off");
    			attr_dev(input, "placeholder", "Search...");
    			input.autofocus = true;
    			attr_dev(input, "class", "svelte-1mifefb");
    			add_location(input, file, 323, 6, 10310);
    			attr_dev(div0, "class", "input-group svelte-1mifefb");
    			add_location(div0, file, 321, 4, 10234);
    			attr_dev(ul, "tabindex", "-1");
    			attr_dev(ul, "class", "tz-groups svelte-1mifefb");
    			attr_dev(ul, "id", /*listBoxId*/ ctx[11]);
    			attr_dev(ul, "role", "listbox");
    			attr_dev(ul, "aria-labelledby", /*labelId*/ ctx[10]);
    			attr_dev(ul, "aria-activedescendant", ul_aria_activedescendant_value = /*currentZone*/ ctx[1] && `tz-${slugify(/*currentZone*/ ctx[1][0])}`);
    			add_location(ul, file, 348, 4, 10905);
    			attr_dev(div1, "class", "tz-dropdown svelte-1mifefb");
    			add_location(div1, file, 311, 2, 9944);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span);
    			append_dev(span, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			/*input_binding*/ ctx[24](input);
    			set_input_value(input, /*userSearch*/ ctx[2]);
    			append_dev(div0, t2);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div1, t3);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[30](ul);
    			current = true;
    			input.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[25]),
    					listen_dev(div1, "introend", /*scrollToHighlighted*/ ctx[20], false, false, false),
    					listen_dev(div1, "keydown", /*keyDown*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*userSearch*/ 4) {
    				set_input_value(input, /*userSearch*/ ctx[2]);
    			}

    			if (/*userSearch*/ ctx[2] && /*userSearch*/ ctx[2].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*highlightedZone, listBoxOptionRefs, setHighlightedZone, handleTimezoneUpdate, filteredZones, groupHasVisibleChildren*/ 312072) {
    				each_value = Object.keys(timezones);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty[0] & /*currentZone*/ 2 && ul_aria_activedescendant_value !== (ul_aria_activedescendant_value = /*currentZone*/ ctx[1] && `tz-${slugify(/*currentZone*/ ctx[1][0])}`)) {
    				attr_dev(ul, "aria-activedescendant", ul_aria_activedescendant_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, slide, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, slide, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*input_binding*/ ctx[24](null);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			/*ul_binding*/ ctx[30](null);
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(311:0) {#if expanded}",
    		ctx
    	});

    	return block;
    }

    // (338:6) {#if userSearch && userSearch.length > 0}
    function create_if_block_3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "×";
    			attr_dev(button, "title", "Clear search text");
    			attr_dev(button, "class", "svelte-1mifefb");
    			add_location(button, file, 338, 8, 10713);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			/*button_binding_1*/ ctx[26](button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*clearSearch*/ ctx[17], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			/*button_binding_1*/ ctx[26](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(338:6) {#if userSearch && userSearch.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (359:8) {#if groupHasVisibleChildren(group, filteredZones)}
    function create_if_block_1(ctx) {
    	let li;
    	let p;
    	let t0_value = /*group*/ ctx[42] + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = Object.entries(timezones[/*group*/ ctx[42]]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(p, "class", "svelte-1mifefb");
    			add_location(p, file, 360, 12, 11316);
    			attr_dev(li, "role", "option");
    			attr_dev(li, "aria-hidden", "true");
    			attr_dev(li, "class", "svelte-1mifefb");
    			add_location(li, file, 359, 10, 11266);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, p);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*highlightedZone, listBoxOptionRefs, setHighlightedZone, handleTimezoneUpdate, filteredZones*/ 279304) {
    				each_value_1 = Object.entries(timezones[/*group*/ ctx[42]]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(359:8) {#if groupHasVisibleChildren(group, filteredZones)}",
    		ctx
    	});

    	return block;
    }

    // (364:12) {#if filteredZones.includes(zoneLabel)}
    function create_if_block_2(ctx) {
    	let li;
    	let t0_value = /*zoneDetails*/ ctx[46][0] + "";
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = /*zoneDetails*/ ctx[46][1] + "";
    	let t3;
    	let t4;
    	let li_id_value;
    	let li_aria_label_value;
    	let li_aria_selected_value;
    	let zoneLabel = /*zoneLabel*/ ctx[45];
    	let mounted;
    	let dispose;
    	const assign_li = () => /*li_binding*/ ctx[27](li, zoneLabel);
    	const unassign_li = () => /*li_binding*/ ctx[27](null, zoneLabel);

    	function mouseover_handler(...args) {
    		return /*mouseover_handler*/ ctx[28](/*zoneDetails*/ ctx[46], ...args);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[29](/*zoneLabel*/ ctx[45], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text("GMT ");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(span, "class", "svelte-1mifefb");
    			add_location(span, file, 374, 33, 11990);
    			attr_dev(li, "role", "option");
    			attr_dev(li, "tabindex", "0");
    			attr_dev(li, "id", li_id_value = `tz-${slugify(/*zoneLabel*/ ctx[45])}`);
    			attr_dev(li, "aria-label", li_aria_label_value = `Select ${/*zoneDetails*/ ctx[46][0]}`);
    			attr_dev(li, "aria-selected", li_aria_selected_value = /*highlightedZone*/ ctx[3] === /*zoneDetails*/ ctx[46][0]);
    			attr_dev(li, "class", "svelte-1mifefb");
    			add_location(li, file, 364, 14, 11495);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(li, t4);
    			assign_li();

    			if (!mounted) {
    				dispose = [
    					listen_dev(li, "mouseover", mouseover_handler, false, false, false),
    					listen_dev(li, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*highlightedZone*/ 8 && li_aria_selected_value !== (li_aria_selected_value = /*highlightedZone*/ ctx[3] === /*zoneDetails*/ ctx[46][0])) {
    				attr_dev(li, "aria-selected", li_aria_selected_value);
    			}

    			if (zoneLabel !== /*zoneLabel*/ ctx[45]) {
    				unassign_li();
    				zoneLabel = /*zoneLabel*/ ctx[45];
    				assign_li();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			unassign_li();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(364:12) {#if filteredZones.includes(zoneLabel)}",
    		ctx
    	});

    	return block;
    }

    // (363:10) {#each Object.entries(groupedZones[group]) as [zoneLabel, zoneDetails]}
    function create_each_block_1(ctx) {
    	let show_if = /*filteredZones*/ ctx[9].includes(/*zoneLabel*/ ctx[45]);
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredZones*/ 512) show_if = /*filteredZones*/ ctx[9].includes(/*zoneLabel*/ ctx[45]);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(363:10) {#each Object.entries(groupedZones[group]) as [zoneLabel, zoneDetails]}",
    		ctx
    	});

    	return block;
    }

    // (358:6) {#each Object.keys(groupedZones) as group}
    function create_each_block(ctx) {
    	let show_if = /*groupHasVisibleChildren*/ ctx[15](/*group*/ ctx[42], /*filteredZones*/ ctx[9]);
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredZones*/ 512) show_if = /*groupHasVisibleChildren*/ ctx[15](/*group*/ ctx[42], /*filteredZones*/ ctx[9]);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(358:6) {#each Object.keys(groupedZones) as group}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let button;
    	let span;
    	let t1_value = /*currentZone*/ ctx[1][0] + "";
    	let t1;
    	let t2;
    	let small;
    	let t3;
    	let t4_value = /*currentZone*/ ctx[1][1] + "";
    	let t4;
    	let t5;
    	let svg;
    	let polygon;
    	let polygon_transform_value;
    	let button_aria_label_value;
    	let t6;
    	let if_block1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*expanded*/ ctx[0] && create_if_block_4(ctx);
    	let if_block1 = /*expanded*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			button = element("button");
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			small = element("small");
    			t3 = text("GMT ");
    			t4 = text(t4_value);
    			t5 = space();
    			svg = svg_element("svg");
    			polygon = svg_element("polygon");
    			t6 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(small, "class", "svelte-1mifefb");
    			add_location(small, file, 305, 25, 9683);
    			attr_dev(span, "class", "svelte-1mifefb");
    			add_location(span, file, 305, 2, 9660);
    			attr_dev(polygon, "x", "0");
    			attr_dev(polygon, "y", "0");
    			attr_dev(polygon, "points", "8, 8, 16, 16, 0, 16");
    			attr_dev(polygon, "transform", polygon_transform_value = "" + ((/*expanded*/ ctx[0] ? "rotate(0)" : "rotate(180, 8, 8)") + " translate(0 -4)"));
    			attr_dev(polygon, "class", "svelte-1mifefb");
    			add_location(polygon, file, 307, 4, 9781);
    			attr_dev(svg, "width", "10");
    			attr_dev(svg, "height", "16");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "svelte-1mifefb");
    			add_location(svg, file, 306, 2, 9728);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "aria-label", button_aria_label_value = `${/*currentZone*/ ctx[1][0]} is currently selected. Change timezone`);
    			attr_dev(button, "aria-haspopup", "listbox");
    			attr_dev(button, "data-toggle", "true");
    			attr_dev(button, "aria-expanded", /*expanded*/ ctx[0]);
    			attr_dev(button, "class", "svelte-1mifefb");
    			add_location(button, file, 295, 0, 9386);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, small);
    			append_dev(small, t3);
    			append_dev(small, t4);
    			append_dev(button, t5);
    			append_dev(button, svg);
    			append_dev(svg, polygon);
    			/*button_binding*/ ctx[23](button);
    			insert_dev(target, t6, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*toggleExpanded*/ ctx[19], false, false, false),
    					listen_dev(button, "keydown", /*toggleExpanded*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*expanded*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if ((!current || dirty[0] & /*currentZone*/ 2) && t1_value !== (t1_value = /*currentZone*/ ctx[1][0] + "")) set_data_dev(t1, t1_value);
    			if ((!current || dirty[0] & /*currentZone*/ 2) && t4_value !== (t4_value = /*currentZone*/ ctx[1][1] + "")) set_data_dev(t4, t4_value);

    			if (!current || dirty[0] & /*expanded*/ 1 && polygon_transform_value !== (polygon_transform_value = "" + ((/*expanded*/ ctx[0] ? "rotate(0)" : "rotate(180, 8, 8)") + " translate(0 -4)"))) {
    				attr_dev(polygon, "transform", polygon_transform_value);
    			}

    			if (!current || dirty[0] & /*currentZone*/ 2 && button_aria_label_value !== (button_aria_label_value = `${/*currentZone*/ ctx[1][0]} is currently selected. Change timezone`)) {
    				attr_dev(button, "aria-label", button_aria_label_value);
    			}

    			if (!current || dirty[0] & /*expanded*/ 1) {
    				attr_dev(button, "aria-expanded", /*expanded*/ ctx[0]);
    			}

    			if (/*expanded*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*expanded*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			/*button_binding*/ ctx[23](null);
    			if (detaching) detach_dev(t6);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Picker", slots, []);
    	let { timezone = null } = $$props;
    	let { expanded = false } = $$props;
    	let { allowedTimezones = null } = $$props;

    	// ***** End Public API *****
    	// What is the current zone?
    	// Array ['Abidjan', '+00:00', '+00:00']
    	// The first value is the display name for the zone, the second is the standard offset, the third the daylight saving time offset
    	let currentZone;

    	// We keep track of what the user is typing in the search box
    	// String
    	let userSearch;

    	// What is the currently selected zone in the dropdown?
    	// String 'Africa/Abidjan'
    	let highlightedZone;

    	// DOM nodes refs
    	let toggleButtonRef;

    	let searchInputRef;
    	let clearButtonRef;
    	let listBoxRef;
    	let listBoxOptionRefs;

    	// A few IDs that will we use for a11y
    	const labelId = uid();

    	const listBoxId = uid();
    	const searchInputId = uid();

    	// We ungroup the zones
    	// e.g. { Africa: {'Africa/Abidjan': ['Abidjan', '+00:00', '+00:00']} }
    	// => {'Africa/Abidjan': ['Abidjan', '+00:00', '+00:00']}
    	const ungroupedZones = ungroup(timezones);

    	const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // eslint-disable-line new-cap

    	// We will only display the timezones the user passed in
    	// and default to all the zones if that's empty or the wrong format
    	let availableZones = ungroupedZones;

    	if (allowedTimezones) {
    		if (Array.isArray(allowedTimezones)) {
    			availableZones = pick(ungroupedZones, [...allowedTimezones, userTimezone]);
    		} else {
    			console.error("You need to provide a list of timezones as an Array!", `You provided ${allowedTimezones}.`);
    		}
    	}

    	// We also want a list of all the valid zones
    	// e.g. {'Africa/Abidjan': ['Abidjan', '+00:00', '+00:00'], 'Africa/Accra': ['Accra', '+00:00', '+00:00']}
    	// => ['Africa/Abidjan', 'Africa/Accra']
    	const validZones = Object.keys(availableZones);

    	// Zones will be filtered as the user types, so we keep track of them internally here
    	let filteredZones = [];

    	// We take the ungroupedZones and create a list of just the user-visible labels
    	// and add them to the refs
    	// e.g. {'Africa/Abidjan': ['Abidjan', '+00:00', '+00:00'], 'Africa/Accra': ['Accra', '+00:00', '+00:00']}
    	// => ['Abidjan', 'Accra']
    	listBoxOptionRefs = Object.values(availableZones).map(([zone]) => ({ [zone]: null }));

    	// We keep track of the initial state so we can reset to these values when needed
    	const initialState = { expanded, userSearch: null };

    	// Reset the dropdown and all internal state to the initial values
    	const reset = () => {
    		$$invalidate(0, expanded = initialState.expanded); // eslint-disable-line prefer-destructuring
    		$$invalidate(2, userSearch = initialState.userSearch); // eslint-disable-line prefer-destructuring
    	};

    	// We will use the dispatcher to send the update event
    	const dispatch = createEventDispatcher();

    	// Because CustomEvents don't bubble by default, custom components won't work
    	// We will need to do some tricks for this to work properly
    	// https://github.com/sveltejs/svelte/issues/3119
    	const component = get_current_component();

    	const dispatchUpdates = () => {
    		const eventName = "update";
    		const eventData = { timezone };

    		const customEvent = new CustomEvent(eventName,
    		{
    				detail: eventData,
    				bubbles: true,
    				cancelable: true,
    				composed: true
    			});

    		component.dispatchEvent && component.dispatchEvent(customEvent);
    		dispatch(eventName, eventData);
    	};

    	// Emit the event back to the consumer
    	const handleTimezoneUpdate = (ev, zoneId) => {
    		$$invalidate(1, currentZone = ungroupedZones[zoneId]);
    		$$invalidate(21, timezone = zoneId);
    		dispatchUpdates();
    		reset();
    		toggleButtonRef.focus();
    		ev.preventDefault();
    	};

    	// ***** Methods *****
    	// Figure out if a grouped zone has any currently visible zones
    	// We use this when the user searches in order to show/hide the group name in the list
    	const groupHasVisibleChildren = (group, zones) => Object.keys(timezones[group]).some(zone => zones.includes(zone));

    	// Scroll the list to a specific element in it if that element is not already visible on screen
    	const scrollList = zone => {
    		const zoneElementRef = listBoxOptionRefs[zone];

    		if (listBoxRef && zoneElementRef) {
    			scrollIntoView(zoneElementRef, listBoxRef);
    			zoneElementRef.focus({ preventScroll: true });
    		}
    	};

    	// Every time the user uses their keyboard to move up or down in the list,
    	// we need to figure out if their at the end/start of the list and scroll the correct elements
    	// into view
    	const moveSelection = direction => {
    		const len = filteredZones.length;
    		const zoneIndex = filteredZones.findIndex(zone => zone === highlightedZone);
    		let index;

    		if (direction === "up") {
    			index = (zoneIndex - 1 + len) % len;
    		}

    		if (direction === "down") {
    			index = (zoneIndex + 1) % len;
    		}

    		// We update the highlightedZone to be the one the user is currently on
    		$$invalidate(3, highlightedZone = filteredZones[index]);

    		// We make sure the highlightedZone is visible on screen, scrolling it into view if not
    		scrollList(highlightedZone);
    	};

    	// We watch for when the user presses Escape, ArrowDown or ArrowUp and react accordingly
    	const keyDown = ev => {
    		// If the clearButton is focused, don't do anything else
    		// We should only continue if the dropdown is expanded
    		if (document.activeElement === clearButtonRef || !expanded) {
    			return;
    		}

    		// If the user presses Escape, we dismiss the drodpown
    		if (ev.keyCode === keyCodes.Escape) {
    			reset();
    		}

    		// If the user presses the down arrow, start navigating the list
    		if (ev.keyCode === keyCodes.ArrowDown) {
    			ev.preventDefault();
    			moveSelection("down");
    		}

    		// If the user presses the up arrow, start navigating the list
    		if (ev.keyCode === keyCodes.ArrowUp) {
    			ev.preventDefault();
    			moveSelection("up");
    		}

    		// If the user presses Enter and the dropdown is expanded, select the current item
    		if (ev.keyCode === keyCodes.Enter && highlightedZone) {
    			handleTimezoneUpdate(ev, highlightedZone);
    		}

    		// If the user start to type letters or numbers, we focus on the Search field
    		if (keyCodes.Characters.includes(ev.keyCode) || ev.keyCode === keyCodes.Backspace) {
    			searchInputRef.focus();
    		}
    	};

    	// When the user presses the clear button when searching,
    	// we want to clear the text and refocus on the input
    	const clearSearch = () => {
    		$$invalidate(2, userSearch = initialState.userSearch); // eslint-disable-line prefer-destructuring

    		// Refocus to the search input
    		searchInputRef.focus();
    	};

    	const setHighlightedZone = zone => {
    		$$invalidate(3, highlightedZone = zone);
    	};

    	const toggleExpanded = ev => {
    		if (ev.keyCode) {
    			// If it's a keyboard event, we should react only to certain keys
    			// Enter and Space should show it
    			if ([keyCodes.Enter, keyCodes.Space].includes(ev.keyCode)) {
    				$$invalidate(0, expanded = !expanded);
    			}

    			// Escape should just hide the menu
    			if (ev.keyCode === keyCodes.Escape) {
    				$$invalidate(0, expanded = false);
    			}

    			// ArrowDown should show it
    			if (ev.keyCode === keyCodes.ArrowDown) {
    				$$invalidate(0, expanded = true);
    			}
    		} else {
    			// If there is no keyCode, it's not a keyboard event
    			$$invalidate(0, expanded = !expanded);
    		}
    	};

    	const scrollToHighlighted = () => {
    		if (expanded && highlightedZone) {
    			scrollList(highlightedZone);
    		}
    	};

    	const setTimezone = tz => {
    		if (!tz) {
    			$$invalidate(21, timezone = userTimezone);
    		}

    		if (tz && !validZones.includes(tz)) {
    			// The timezone must be a valid timezone, so we check it against our list of values in flat
    			console.warn(`The timezone provided is not valid: ${tz}!`, `Valid zones are: ${validZones}`);

    			$$invalidate(21, timezone = userTimezone);
    		}

    		$$invalidate(1, currentZone = ungroupedZones[timezone]);
    		setHighlightedZone(timezone);
    	};

    	// ***** Lifecycle methods *****
    	onMount(() => {
    		setTimezone(timezone);
    		scrollToHighlighted();
    	});

    	const writable_props = ["timezone", "expanded", "allowedTimezones"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Picker> was created with unknown prop '${key}'`);
    	});

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			toggleButtonRef = $$value;
    			$$invalidate(4, toggleButtonRef);
    		});
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			searchInputRef = $$value;
    			$$invalidate(5, searchInputRef);
    		});
    	}

    	function input_input_handler() {
    		userSearch = this.value;
    		$$invalidate(2, userSearch);
    	}

    	function button_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			clearButtonRef = $$value;
    			$$invalidate(6, clearButtonRef);
    		});
    	}

    	function li_binding($$value, zoneLabel) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			listBoxOptionRefs[zoneLabel] = $$value;
    			$$invalidate(8, listBoxOptionRefs);
    		});
    	}

    	const mouseover_handler = zoneDetails => setHighlightedZone(zoneDetails[0]);
    	const click_handler = (zoneLabel, ev) => handleTimezoneUpdate(ev, zoneLabel);

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			listBoxRef = $$value;
    			$$invalidate(7, listBoxRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("timezone" in $$props) $$invalidate(21, timezone = $$props.timezone);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("allowedTimezones" in $$props) $$invalidate(22, allowedTimezones = $$props.allowedTimezones);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onMount,
    		get_current_component,
    		slide,
    		groupedZones: timezones,
    		scrollIntoView,
    		uid,
    		slugify,
    		keyCodes,
    		ungroup,
    		filter,
    		pick,
    		timezone,
    		expanded,
    		allowedTimezones,
    		currentZone,
    		userSearch,
    		highlightedZone,
    		toggleButtonRef,
    		searchInputRef,
    		clearButtonRef,
    		listBoxRef,
    		listBoxOptionRefs,
    		labelId,
    		listBoxId,
    		searchInputId,
    		ungroupedZones,
    		userTimezone,
    		availableZones,
    		validZones,
    		filteredZones,
    		initialState,
    		reset,
    		dispatch,
    		component,
    		dispatchUpdates,
    		handleTimezoneUpdate,
    		groupHasVisibleChildren,
    		scrollList,
    		moveSelection,
    		keyDown,
    		clearSearch,
    		setHighlightedZone,
    		toggleExpanded,
    		scrollToHighlighted,
    		setTimezone
    	});

    	$$self.$inject_state = $$props => {
    		if ("timezone" in $$props) $$invalidate(21, timezone = $$props.timezone);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("allowedTimezones" in $$props) $$invalidate(22, allowedTimezones = $$props.allowedTimezones);
    		if ("currentZone" in $$props) $$invalidate(1, currentZone = $$props.currentZone);
    		if ("userSearch" in $$props) $$invalidate(2, userSearch = $$props.userSearch);
    		if ("highlightedZone" in $$props) $$invalidate(3, highlightedZone = $$props.highlightedZone);
    		if ("toggleButtonRef" in $$props) $$invalidate(4, toggleButtonRef = $$props.toggleButtonRef);
    		if ("searchInputRef" in $$props) $$invalidate(5, searchInputRef = $$props.searchInputRef);
    		if ("clearButtonRef" in $$props) $$invalidate(6, clearButtonRef = $$props.clearButtonRef);
    		if ("listBoxRef" in $$props) $$invalidate(7, listBoxRef = $$props.listBoxRef);
    		if ("listBoxOptionRefs" in $$props) $$invalidate(8, listBoxOptionRefs = $$props.listBoxOptionRefs);
    		if ("availableZones" in $$props) $$invalidate(31, availableZones = $$props.availableZones);
    		if ("filteredZones" in $$props) $$invalidate(9, filteredZones = $$props.filteredZones);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*userSearch*/ 4 | $$self.$$.dirty[1] & /*availableZones*/ 1) {
    			// ***** Reactive *****
    			// As the user types, we filter the available zones to show only those that should be visible
    			 $$invalidate(9, filteredZones = userSearch && userSearch.length > 0
    			? filter(userSearch, availableZones)
    			: validZones.slice());
    		}

    		if ($$self.$$.dirty[0] & /*timezone*/ 2097152) {
    			// We want to properly handle any potential changes to the current timezone
    			// that might come in from the consumer of the component.
    			// This includes setting the proper timezone and dispatching the updated values
    			// back up to the consumer
    			 setTimezone(timezone);
    		}
    	};

    	return [
    		expanded,
    		currentZone,
    		userSearch,
    		highlightedZone,
    		toggleButtonRef,
    		searchInputRef,
    		clearButtonRef,
    		listBoxRef,
    		listBoxOptionRefs,
    		filteredZones,
    		labelId,
    		listBoxId,
    		searchInputId,
    		reset,
    		handleTimezoneUpdate,
    		groupHasVisibleChildren,
    		keyDown,
    		clearSearch,
    		setHighlightedZone,
    		toggleExpanded,
    		scrollToHighlighted,
    		timezone,
    		allowedTimezones,
    		button_binding,
    		input_binding,
    		input_input_handler,
    		button_binding_1,
    		li_binding,
    		mouseover_handler,
    		click_handler,
    		ul_binding
    	];
    }

    class Picker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				timezone: 21,
    				expanded: 0,
    				allowedTimezones: 22
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Picker",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get timezone() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timezone(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowedTimezones() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowedTimezones(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function requiredArgs(required, args) {
      if (args.length < required) {
        throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
      }
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */

    function toDate(argument) {
      requiredArgs(1, arguments);
      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    /**
     * @name isValid
     * @category Common Helpers
     * @summary Is the given date valid?
     *
     * @description
     * Returns false if argument is Invalid Date and true otherwise.
     * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * Invalid Date is a Date, whose time value is NaN.
     *
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Now `isValid` doesn't throw an exception
     *   if the first argument is not an instance of Date.
     *   Instead, argument is converted beforehand using `toDate`.
     *
     *   Examples:
     *
     *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
     *   |---------------------------|---------------|---------------|
     *   | `new Date()`              | `true`        | `true`        |
     *   | `new Date('2016-01-01')`  | `true`        | `true`        |
     *   | `new Date('')`            | `false`       | `false`       |
     *   | `new Date(1488370835081)` | `true`        | `true`        |
     *   | `new Date(NaN)`           | `false`       | `false`       |
     *   | `'2016-01-01'`            | `TypeError`   | `false`       |
     *   | `''`                      | `TypeError`   | `false`       |
     *   | `1488370835081`           | `TypeError`   | `true`        |
     *   | `NaN`                     | `TypeError`   | `false`       |
     *
     *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
     *   that try to coerce arguments to the expected type
     *   (which is also the case with other *date-fns* functions).
     *
     * @param {*} date - the date to check
     * @returns {Boolean} the date is valid
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // For the valid date:
     * var result = isValid(new Date(2014, 1, 31))
     * //=> true
     *
     * @example
     * // For the value, convertable into a date:
     * var result = isValid(1393804800000)
     * //=> true
     *
     * @example
     * // For the invalid date:
     * var result = isValid(new Date(''))
     * //=> false
     */

    function isValid(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      return !isNaN(date);
    }

    var formatDistanceLocale = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXWeeks: {
        one: 'about 1 week',
        other: 'about {{count}} weeks'
      },
      xWeeks: {
        one: '1 week',
        other: '{{count}} weeks'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };
    function formatDistance(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale[token] === 'string') {
        result = formatDistanceLocale[token];
      } else if (count === 1) {
        result = formatDistanceLocale[token].one;
      } else {
        result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    }

    function buildFormatLongFn(args) {
      return function (dirtyOptions) {
        var options = dirtyOptions || {};
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };
    function formatRelative(token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    }

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
        return valuesArray[index];
      };
    }

    var eraValues = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'] // Note: in English, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    function ordinalNumber(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`:
      //
      //   var options = dirtyOptions || {}
      //   var unit = String(options.unit)
      //
      // where `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    }

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };

    function buildMatchPatternFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var matchResult = string.match(args.matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);

        if (!parseResult) {
          return null;
        }

        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function buildMatchFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var value;

        if (Object.prototype.toString.call(parsePatterns) === '[object Array]') {
          value = findIndex(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        } else {
          value = findKey(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        }

        value = args.valueCallback ? args.valueCallback(value) : value;
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }
    }

    function findIndex(array, predicate) {
      for (var key = 0; key < array.length; key++) {
        if (predicate(array[key])) {
          return key;
        }
      }
    }

    var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern = /\d+/i;
    var matchEraPatterns = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */

    var locale = {
      code: 'en-US',
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * var result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * var result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    function addLeadingZeros(number, targetLength) {
      var sign = number < 0 ? '-' : '';
      var output = Math.abs(number).toString();

      while (output.length < targetLength) {
        output = '0' + output;
      }

      return sign + output;
    }

    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* |                                |
     * |  d  | Day of month                   |  D  |                                |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  m  | Minute                         |  M  | Month                          |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  y  | Year (abs)                     |  Y  |                                |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     */

    var formatters = {
      // Year
      y: function (date, token) {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
      },
      // Month
      M: function (date, token) {
        var month = date.getUTCMonth();
        return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
      },
      // Day of the month
      d: function (date, token) {
        return addLeadingZeros(date.getUTCDate(), token.length);
      },
      // AM or PM
      a: function (date, token) {
        var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return dayPeriodEnumValue.toUpperCase();

          case 'aaaaa':
            return dayPeriodEnumValue[0];

          case 'aaaa':
          default:
            return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
        }
      },
      // Hour [1-12]
      h: function (date, token) {
        return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
      },
      // Hour [0-23]
      H: function (date, token) {
        return addLeadingZeros(date.getUTCHours(), token.length);
      },
      // Minute
      m: function (date, token) {
        return addLeadingZeros(date.getUTCMinutes(), token.length);
      },
      // Second
      s: function (date, token) {
        return addLeadingZeros(date.getUTCSeconds(), token.length);
      },
      // Fraction of second
      S: function (date, token) {
        var numberOfDigits = token.length;
        var milliseconds = date.getUTCMilliseconds();
        var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
        return addLeadingZeros(fractionalSeconds, token.length);
      }
    };

    var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCDayOfYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    var dayPeriodEnum = {
      am: 'am',
      pm: 'pm',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
      /*
       * |     | Unit                           |     | Unit                           |
       * |-----|--------------------------------|-----|--------------------------------|
       * |  a  | AM, PM                         |  A* | Milliseconds in day            |
       * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
       * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
       * |  d  | Day of month                   |  D  | Day of year                    |
       * |  e  | Local day of week              |  E  | Day of week                    |
       * |  f  |                                |  F* | Day of week in month           |
       * |  g* | Modified Julian day            |  G  | Era                            |
       * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
       * |  i! | ISO day of week                |  I! | ISO week of year               |
       * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
       * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
       * |  l* | (deprecated)                   |  L  | Stand-alone month              |
       * |  m  | Minute                         |  M  | Month                          |
       * |  n  |                                |  N  |                                |
       * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
       * |  p! | Long localized time            |  P! | Long localized date            |
       * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
       * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
       * |  s  | Second                         |  S  | Fraction of second             |
       * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
       * |  u  | Extended year                  |  U* | Cyclic year                    |
       * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
       * |  w  | Local week of year             |  W* | Week of month                  |
       * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
       * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
       * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
       *
       * Letters marked by * are not implemented but reserved by Unicode standard.
       *
       * Letters marked by ! are non-standard, but implemented by date-fns:
       * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
       * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
       *   i.e. 7 for Sunday, 1 for Monday, etc.
       * - `I` is ISO week of year, as opposed to `w` which is local week of year.
       * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
       *   `R` is supposed to be used in conjunction with `I` and `i`
       *   for universal ISO week-numbering date, whereas
       *   `Y` is supposed to be used in conjunction with `w` and `e`
       *   for week-numbering date specific to the locale.
       * - `P` is long localized date format
       * - `p` is long localized time format
       */

    };
    var formatters$1 = {
      // Era
      G: function (date, token, localize) {
        var era = date.getUTCFullYear() > 0 ? 1 : 0;

        switch (token) {
          // AD, BC
          case 'G':
          case 'GG':
          case 'GGG':
            return localize.era(era, {
              width: 'abbreviated'
            });
          // A, B

          case 'GGGGG':
            return localize.era(era, {
              width: 'narrow'
            });
          // Anno Domini, Before Christ

          case 'GGGG':
          default:
            return localize.era(era, {
              width: 'wide'
            });
        }
      },
      // Year
      y: function (date, token, localize) {
        // Ordinal number
        if (token === 'yo') {
          var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

          var year = signedYear > 0 ? signedYear : 1 - signedYear;
          return localize.ordinalNumber(year, {
            unit: 'year'
          });
        }

        return formatters.y(date, token);
      },
      // Local week-numbering year
      Y: function (date, token, localize, options) {
        var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

        if (token === 'YY') {
          var twoDigitYear = weekYear % 100;
          return addLeadingZeros(twoDigitYear, 2);
        } // Ordinal number


        if (token === 'Yo') {
          return localize.ordinalNumber(weekYear, {
            unit: 'year'
          });
        } // Padding


        return addLeadingZeros(weekYear, token.length);
      },
      // ISO week-numbering year
      R: function (date, token) {
        var isoWeekYear = getUTCISOWeekYear(date); // Padding

        return addLeadingZeros(isoWeekYear, token.length);
      },
      // Extended year. This is a single number designating the year of this calendar system.
      // The main difference between `y` and `u` localizers are B.C. years:
      // | Year | `y` | `u` |
      // |------|-----|-----|
      // | AC 1 |   1 |   1 |
      // | BC 1 |   1 |   0 |
      // | BC 2 |   2 |  -1 |
      // Also `yy` always returns the last two digits of a year,
      // while `uu` pads single digit years to 2 characters and returns other years unchanged.
      u: function (date, token) {
        var year = date.getUTCFullYear();
        return addLeadingZeros(year, token.length);
      },
      // Quarter
      Q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'Q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'QQ':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'Qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'QQQ':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'QQQQQ':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'formatting'
            });
          // 1st quarter, 2nd quarter, ...

          case 'QQQQ':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone quarter
      q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'qq':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'qqq':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'qqqqq':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'standalone'
            });
          // 1st quarter, 2nd quarter, ...

          case 'qqqq':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Month
      M: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          case 'M':
          case 'MM':
            return formatters.M(date, token);
          // 1st, 2nd, ..., 12th

          case 'Mo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'MMM':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // J, F, ..., D

          case 'MMMMM':
            return localize.month(month, {
              width: 'narrow',
              context: 'formatting'
            });
          // January, February, ..., December

          case 'MMMM':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone month
      L: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          // 1, 2, ..., 12
          case 'L':
            return String(month + 1);
          // 01, 02, ..., 12

          case 'LL':
            return addLeadingZeros(month + 1, 2);
          // 1st, 2nd, ..., 12th

          case 'Lo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'LLL':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // J, F, ..., D

          case 'LLLLL':
            return localize.month(month, {
              width: 'narrow',
              context: 'standalone'
            });
          // January, February, ..., December

          case 'LLLL':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Local week of year
      w: function (date, token, localize, options) {
        var week = getUTCWeek(date, options);

        if (token === 'wo') {
          return localize.ordinalNumber(week, {
            unit: 'week'
          });
        }

        return addLeadingZeros(week, token.length);
      },
      // ISO week of year
      I: function (date, token, localize) {
        var isoWeek = getUTCISOWeek(date);

        if (token === 'Io') {
          return localize.ordinalNumber(isoWeek, {
            unit: 'week'
          });
        }

        return addLeadingZeros(isoWeek, token.length);
      },
      // Day of the month
      d: function (date, token, localize) {
        if (token === 'do') {
          return localize.ordinalNumber(date.getUTCDate(), {
            unit: 'date'
          });
        }

        return formatters.d(date, token);
      },
      // Day of year
      D: function (date, token, localize) {
        var dayOfYear = getUTCDayOfYear(date);

        if (token === 'Do') {
          return localize.ordinalNumber(dayOfYear, {
            unit: 'dayOfYear'
          });
        }

        return addLeadingZeros(dayOfYear, token.length);
      },
      // Day of week
      E: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();

        switch (token) {
          // Tue
          case 'E':
          case 'EE':
          case 'EEE':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'EEEEE':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'EEEEEE':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'EEEE':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Local day of week
      e: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (Nth day of week with current locale or weekStartsOn)
          case 'e':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'ee':
            return addLeadingZeros(localDayOfWeek, 2);
          // 1st, 2nd, ..., 7th

          case 'eo':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'eee':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'eeeee':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'eeeeee':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'eeee':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone local day of week
      c: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (same as in `e`)
          case 'c':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'cc':
            return addLeadingZeros(localDayOfWeek, token.length);
          // 1st, 2nd, ..., 7th

          case 'co':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'ccc':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // T

          case 'ccccc':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'standalone'
            });
          // Tu

          case 'cccccc':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'standalone'
            });
          // Tuesday

          case 'cccc':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // ISO day of week
      i: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();
        var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        switch (token) {
          // 2
          case 'i':
            return String(isoDayOfWeek);
          // 02

          case 'ii':
            return addLeadingZeros(isoDayOfWeek, token.length);
          // 2nd

          case 'io':
            return localize.ordinalNumber(isoDayOfWeek, {
              unit: 'day'
            });
          // Tue

          case 'iii':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'iiiii':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'iiiiii':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'iiii':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM or PM
      a: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'aaaaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'aaaa':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM, PM, midnight, noon
      b: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours === 12) {
          dayPeriodEnumValue = dayPeriodEnum.noon;
        } else if (hours === 0) {
          dayPeriodEnumValue = dayPeriodEnum.midnight;
        } else {
          dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
        }

        switch (token) {
          case 'b':
          case 'bb':
          case 'bbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'bbbbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'bbbb':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // in the morning, in the afternoon, in the evening, at night
      B: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours >= 17) {
          dayPeriodEnumValue = dayPeriodEnum.evening;
        } else if (hours >= 12) {
          dayPeriodEnumValue = dayPeriodEnum.afternoon;
        } else if (hours >= 4) {
          dayPeriodEnumValue = dayPeriodEnum.morning;
        } else {
          dayPeriodEnumValue = dayPeriodEnum.night;
        }

        switch (token) {
          case 'B':
          case 'BB':
          case 'BBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'BBBBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'BBBB':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Hour [1-12]
      h: function (date, token, localize) {
        if (token === 'ho') {
          var hours = date.getUTCHours() % 12;
          if (hours === 0) hours = 12;
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return formatters.h(date, token);
      },
      // Hour [0-23]
      H: function (date, token, localize) {
        if (token === 'Ho') {
          return localize.ordinalNumber(date.getUTCHours(), {
            unit: 'hour'
          });
        }

        return formatters.H(date, token);
      },
      // Hour [0-11]
      K: function (date, token, localize) {
        var hours = date.getUTCHours() % 12;

        if (token === 'Ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Hour [1-24]
      k: function (date, token, localize) {
        var hours = date.getUTCHours();
        if (hours === 0) hours = 24;

        if (token === 'ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Minute
      m: function (date, token, localize) {
        if (token === 'mo') {
          return localize.ordinalNumber(date.getUTCMinutes(), {
            unit: 'minute'
          });
        }

        return formatters.m(date, token);
      },
      // Second
      s: function (date, token, localize) {
        if (token === 'so') {
          return localize.ordinalNumber(date.getUTCSeconds(), {
            unit: 'second'
          });
        }

        return formatters.s(date, token);
      },
      // Fraction of second
      S: function (date, token) {
        return formatters.S(date, token);
      },
      // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
      X: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        if (timezoneOffset === 0) {
          return 'Z';
        }

        switch (token) {
          // Hours and optional minutes
          case 'X':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XX`

          case 'XXXX':
          case 'XX':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XXX`

          case 'XXXXX':
          case 'XXX': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
      x: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Hours and optional minutes
          case 'x':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xx`

          case 'xxxx':
          case 'xx':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xxx`

          case 'xxxxx':
          case 'xxx': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (GMT)
      O: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'O':
          case 'OO':
          case 'OOO':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'OOOO':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (specific non-location)
      z: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'z':
          case 'zz':
          case 'zzz':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'zzzz':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Seconds timestamp
      t: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = Math.floor(originalDate.getTime() / 1000);
        return addLeadingZeros(timestamp, token.length);
      },
      // Milliseconds timestamp
      T: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = originalDate.getTime();
        return addLeadingZeros(timestamp, token.length);
      }
    };

    function formatTimezoneShort(offset, dirtyDelimiter) {
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;

      if (minutes === 0) {
        return sign + String(hours);
      }

      var delimiter = dirtyDelimiter || '';
      return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
    }

    function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
      if (offset % 60 === 0) {
        var sign = offset > 0 ? '-' : '+';
        return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
      }

      return formatTimezone(offset, dirtyDelimiter);
    }

    function formatTimezone(offset, dirtyDelimiter) {
      var delimiter = dirtyDelimiter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
      var minutes = addLeadingZeros(absOffset % 60, 2);
      return sign + hours + delimiter + minutes;
    }

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/);
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };

    var MILLISECONDS_IN_MINUTE = 60000;

    function getDateMillisecondsPart(date) {
      return date.getTime() % MILLISECONDS_IN_MINUTE;
    }
    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */


    function getTimezoneOffsetInMilliseconds(dirtyDate) {
      var date = new Date(dirtyDate.getTime());
      var baseTimezoneOffset = Math.ceil(date.getTimezoneOffset());
      date.setSeconds(0, 0);
      var hasNegativeUTCOffset = baseTimezoneOffset > 0;
      var millisecondsPartOfTimezoneOffset = hasNegativeUTCOffset ? (MILLISECONDS_IN_MINUTE + getDateMillisecondsPart(date)) % MILLISECONDS_IN_MINUTE : getDateMillisecondsPart(date);
      return baseTimezoneOffset * MILLISECONDS_IN_MINUTE + millisecondsPartOfTimezoneOffset;
    }

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token) {
      if (token === 'YYYY') {
        throw new RangeError('Use `yyyy` instead of `YYYY` for formatting years; see: https://git.io/fxCyr');
      } else if (token === 'YY') {
        throw new RangeError('Use `yy` instead of `YY` for formatting years; see: https://git.io/fxCyr');
      } else if (token === 'D') {
        throw new RangeError('Use `d` instead of `D` for formatting days of the month; see: https://git.io/fxCyr');
      } else if (token === 'DD') {
        throw new RangeError('Use `dd` instead of `DD` for formatting days of the month; see: https://git.io/fxCyr');
      }
    }

    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'([^]*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name format
     * @category Common Helpers
     * @summary Format the date.
     *
     * @description
     * Return the formatted date string in the given format. The result may vary by locale.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     * (see the last example)
     *
     * Format of the string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 7 below the table).
     *
     * Accepted patterns:
     * | Unit                            | Pattern | Result examples                   | Notes |
     * |---------------------------------|---------|-----------------------------------|-------|
     * | Era                             | G..GGG  | AD, BC                            |       |
     * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 | GGGGG   | A, B                              |       |
     * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
     * |                                 | yy      | 44, 01, 00, 17                    | 5     |
     * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
     * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
     * |                                 | yyyyy   | ...                               | 3,5   |
     * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
     * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
     * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
     * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
     * |                                 | YYYYY   | ...                               | 3,5   |
     * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
     * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
     * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
     * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
     * |                                 | RRRRR   | ...                               | 3,5,7 |
     * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
     * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
     * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
     * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
     * |                                 | uuuuu   | ...                               | 3,5   |
     * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
     * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | QQ      | 01, 02, 03, 04                    |       |
     * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
     * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | qq      | 01, 02, 03, 04                    |       |
     * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
     * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
     * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | MM      | 01, 02, ..., 12                   |       |
     * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 | MMMM    | January, February, ..., December  | 2     |
     * |                                 | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
     * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | LL      | 01, 02, ..., 12                   |       |
     * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 | LLLL    | January, February, ..., December  | 2     |
     * |                                 | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | w       | 1, 2, ..., 53                     |       |
     * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
     * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | II      | 01, 02, ..., 53                   | 7     |
     * | Day of month                    | d       | 1, 2, ..., 31                     |       |
     * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
     * |                                 | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
     * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
     * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
     * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 | DDDD    | ...                               | 3     |
     * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
     * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
     * |                                 | ii      | 01, 02, ..., 07                   | 7     |
     * |                                 | iii     | Mon, Tue, Wed, ..., Su            | 7     |
     * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
     * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
     * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 7     |
     * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | ee      | 02, 03, ..., 01                   |       |
     * |                                 | eee     | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | cc      | 02, 03, ..., 01                   |       |
     * |                                 | ccc     | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          | a..aaa  | AM, PM                            |       |
     * |                                 | aaaa    | a.m., p.m.                        | 2     |
     * |                                 | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          | b..bbb  | AM, PM, noon, midnight            |       |
     * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
     * |                                 | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
     * |                                 | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
     * |                                 | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
     * |                                 | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
     * |                                 | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          | m       | 0, 1, ..., 59                     |       |
     * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | mm      | 00, 01, ..., 59                   |       |
     * | Second                          | s       | 0, 1, ..., 59                     |       |
     * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | ss      | 00, 01, ..., 59                   |       |
     * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
     * |                                 | SS      | 00, 01, ..., 99                   |       |
     * |                                 | SSS     | 000, 0001, ..., 999               |       |
     * |                                 | SSSS    | ...                               | 3     |
     * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
     * |                                 | XX      | -0800, +0530, Z                   |       |
     * |                                 | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
     * |                                 | xx      | -0800, +0530, +0000               |       |
     * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
     * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
     * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
     * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
     * | Seconds timestamp               | t       | 512969520                         | 7     |
     * |                                 | tt      | ...                               | 3,7   |
     * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
     * |                                 | TT      | ...                               | 3,7   |
     * | Long localized date             | P       | 05/29/1453                        | 7     |
     * |                                 | PP      | May 29, 1453                      | 7     |
     * |                                 | PPP     | May 29th, 1453                    | 7     |
     * |                                 | PPPP    | Sunday, May 29th, 1453            | 2,7   |
     * | Long localized time             | p       | 12:00 AM                          | 7     |
     * |                                 | pp      | 12:00:00 AM                       | 7     |
     * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
     * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
     * | Combination of date and time    | Pp      | 05/29/1453, 12:00 AM              | 7     |
     * |                                 | PPpp    | May 29, 1453, 12:00:00 AM         | 7     |
     * |                                 | PPPppp  | May 29th, 1453 at ...             | 7     |
     * |                                 | PPPPpppp| Sunday, May 29th, 1453 at ...     | 2,7   |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
     *    the output will be the same as default pattern for this unit, usually
     *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
     *    are marked with "2" in the last column of the table.
     *
     *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
     *
     * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
     *    The output will be padded with zeros to match the length of the pattern.
     *
     *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
     *
     * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 5. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` always returns the last two digits of a year,
     *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
     *
     *    | Year | `yy` | `uu` |
     *    |------|------|------|
     *    | 1    |   01 |   01 |
     *    | 14   |   14 |   14 |
     *    | 376  |   76 |  376 |
     *    | 1453 |   53 | 1453 |
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
     *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
     *
     * 6. Specific non-location timezones are currently unavailable in `date-fns`,
     *    so right now these tokens fall back to GMT timezones.
     *
     * 7. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `t`: seconds timestamp
     *    - `T`: milliseconds timestamp
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 9. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The second argument is now required for the sake of explicitness.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   format(new Date(2016, 0, 1))
     *
     *   // v2.0.0 onward
     *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
     *   ```
     *
     * - New format string API for `format` function
     *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
     *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
     *
     * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
     *
     * @param {Date|Number} date - the original date
     * @param {String} format - the string of tokens
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {String} the formatted date string
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `date` must not be Invalid Date
     * @throws {RangeError} `options.locale` must contain `localize` property
     * @throws {RangeError} `options.locale` must contain `formatLong` property
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Represent 11 February 2014 in middle-endian format:
     * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
     * //=> '02/11/2014'
     *
     * @example
     * // Represent 2 July 2014 in Esperanto:
     * import { eoLocale } from 'date-fns/locale/eo'
     * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
     *   locale: eoLocale
     * })
     * //=> '2-a de julio 2014'
     *
     * @example
     * // Escape string by single quote characters:
     * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
     * //=> "3 o'clock"
     */

    function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      requiredArgs(2, arguments);
      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale$1 = options.locale || locale;
      var localeFirstWeekContainsDate = locale$1.options && locale$1.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale$1.options && locale$1.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (!locale$1.localize) {
        throw new RangeError('locale must contain localize property');
      }

      if (!locale$1.formatLong) {
        throw new RangeError('locale must contain formatLong property');
      }

      var originalDate = toDate(dirtyDate);

      if (!isValid(originalDate)) {
        throw new RangeError('Invalid time value');
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


      var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
      var utcDate = subMilliseconds(originalDate, timezoneOffset);
      var formatterOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale$1,
        _originalDate: originalDate
      };
      var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale$1.formatLong, formatterOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp).map(function (substring) {
        // Replace two single quote characters with one single quote character
        if (substring === "''") {
          return "'";
        }

        var firstCharacter = substring[0];

        if (firstCharacter === "'") {
          return cleanEscapedString(substring);
        }

        var formatter = formatters$1[firstCharacter];

        if (formatter) {
          if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
            throwProtectedError(substring);
          }

          if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
            throwProtectedError(substring);
          }

          return formatter(utcDate, substring, locale$1.localize, formatterOptions);
        }

        if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
          throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
        }

        return substring;
      }).join('');
      return result;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    /**
     * Returns the [year, month, day, hour, minute, seconds] tokens of the provided
     * `date` as it will be rendered in the `timeZone`.
     */
    function tzTokenizeDate(date, timeZone) {
      var dtf = getDateTimeFormat(timeZone);
      return dtf.formatToParts ? partsOffset(dtf, date) : hackyOffset(dtf, date)
    }

    var typeToPos = {
      year: 0,
      month: 1,
      day: 2,
      hour: 3,
      minute: 4,
      second: 5
    };

    function partsOffset(dtf, date) {
      var formatted = dtf.formatToParts(date);
      var filled = [];
      for (var i = 0; i < formatted.length; i++) {
        var pos = typeToPos[formatted[i].type];

        if (pos >= 0) {
          filled[pos] = parseInt(formatted[i].value, 10);
        }
      }
      return filled
    }

    function hackyOffset(dtf, date) {
      var formatted = dtf.format(date).replace(/\u200E/g, '');
      var parsed = /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+):(\d+)/.exec(formatted);
      // var [, fMonth, fDay, fYear, fHour, fMinute, fSecond] = parsed
      // return [fYear, fMonth, fDay, fHour, fMinute, fSecond]
      return [parsed[3], parsed[1], parsed[2], parsed[4], parsed[5], parsed[6]]
    }

    // Get a cached Intl.DateTimeFormat instance for the IANA `timeZone`. This can be used
    // to get deterministic local date/time output according to the `en-US` locale which
    // can be used to extract local time parts as necessary.
    var dtfCache = {};
    function getDateTimeFormat(timeZone) {
      if (!dtfCache[timeZone]) {
        // New browsers use `hourCycle`, IE and Chrome <73 does not support it and uses `hour12`
        var testDateFormatted = new Intl.DateTimeFormat('en-US', {
          hour12: false,
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date('2014-06-25T04:00:00.123Z'));
        var hourCycleSupported =
          testDateFormatted === '06/25/2014, 00:00:00' ||
          testDateFormatted === '‎06‎/‎25‎/‎2014‎ ‎00‎:‎00‎:‎00';

        dtfCache[timeZone] = hourCycleSupported
          ? new Intl.DateTimeFormat('en-US', {
              hour12: false,
              timeZone: timeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          : new Intl.DateTimeFormat('en-US', {
              hourCycle: 'h23',
              timeZone: timeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
      }
      return dtfCache[timeZone]
    }

    var MILLISECONDS_IN_HOUR = 3600000;
    var MILLISECONDS_IN_MINUTE$1 = 60000;

    var patterns = {
      timezone: /([Z+-].*)$/,
      timezoneZ: /^(Z)$/,
      timezoneHH: /^([+-])(\d{2})$/,
      timezoneHHMM: /^([+-])(\d{2}):?(\d{2})$/,
      timezoneIANA: /(UTC|(?:[a-zA-Z]+\/[a-zA-Z_]+(?:\/[a-zA-Z_]+)?))$/
    };

    // Parse various time zone offset formats to an offset in milliseconds
    function tzParseTimezone(timezoneString, date) {
      var token;
      var absoluteOffset;

      // Z
      token = patterns.timezoneZ.exec(timezoneString);
      if (token) {
        return 0
      }

      var hours;

      // ±hh
      token = patterns.timezoneHH.exec(timezoneString);
      if (token) {
        hours = parseInt(token[2], 10);

        if (!validateTimezone()) {
          return NaN
        }

        absoluteOffset = hours * MILLISECONDS_IN_HOUR;
        return token[1] === '+' ? -absoluteOffset : absoluteOffset
      }

      // ±hh:mm or ±hhmm
      token = patterns.timezoneHHMM.exec(timezoneString);
      if (token) {
        hours = parseInt(token[2], 10);
        var minutes = parseInt(token[3], 10);

        if (!validateTimezone(hours, minutes)) {
          return NaN
        }

        absoluteOffset =
          hours * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE$1;
        return token[1] === '+' ? -absoluteOffset : absoluteOffset
      }

      // IANA time zone
      token = patterns.timezoneIANA.exec(timezoneString);
      if (token) {
        // var [fYear, fMonth, fDay, fHour, fMinute, fSecond] = tzTokenizeDate(date, timezoneString)
        var tokens = tzTokenizeDate(date, timezoneString);
        var asUTC = Date.UTC(
          tokens[0],
          tokens[1] - 1,
          tokens[2],
          tokens[3],
          tokens[4],
          tokens[5]
        );
        var timestampWithMsZeroed = date.getTime() - (date.getTime() % 1000);
        return -(asUTC - timestampWithMsZeroed)
      }

      return 0
    }

    function validateTimezone(hours, minutes) {
      if (minutes != null && (minutes < 0 || minutes > 59)) {
        return false
      }

      return true
    }

    var MILLISECONDS_IN_HOUR$1 = 3600000;
    var MILLISECONDS_IN_MINUTE$2 = 60000;
    var DEFAULT_ADDITIONAL_DIGITS = 2;

    var patterns$1 = {
      dateTimeDelimeter: /[T ]/,
      plainTime: /:/,
      timeZoneDelimeter: /[Z ]/i,

      // year tokens
      YY: /^(\d{2})$/,
      YYY: [
        /^([+-]\d{2})$/, // 0 additional digits
        /^([+-]\d{3})$/, // 1 additional digit
        /^([+-]\d{4})$/ // 2 additional digits
      ],
      YYYY: /^(\d{4})/,
      YYYYY: [
        /^([+-]\d{4})/, // 0 additional digits
        /^([+-]\d{5})/, // 1 additional digit
        /^([+-]\d{6})/ // 2 additional digits
      ],

      // date tokens
      MM: /^-(\d{2})$/,
      DDD: /^-?(\d{3})$/,
      MMDD: /^-?(\d{2})-?(\d{2})$/,
      Www: /^-?W(\d{2})$/,
      WwwD: /^-?W(\d{2})-?(\d{1})$/,

      HH: /^(\d{2}([.,]\d*)?)$/,
      HHMM: /^(\d{2}):?(\d{2}([.,]\d*)?)$/,
      HHMMSS: /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/,

      // timezone tokens (to identify the presence of a tz)
      timezone: /([Z+-].*| UTC|(?:[a-zA-Z]+\/[a-zA-Z_]+(?:\/[a-zA-Z_]+)?))$/
    };

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If an argument is a string, the function tries to parse it.
     * Function accepts complete ISO 8601 formats as well as partial implementations.
     * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
     * If the function cannot parse the string or the values are invalid, it returns Invalid Date.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     * All *date-fns* functions will throw `RangeError` if `options.additionalDigits` is not 0, 1, 2 or undefined.
     *
     * @param {Date|String|Number} argument - the value to convert
     * @param {OptionsWithTZ} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
     * @param {0|1|2} [options.additionalDigits=2] - the additional number of digits in the extended year format
     * @param {String} [options.timeZone=''] - used to specify the IANA time zone offset of a date String.
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
     *
     * @example
     * // Convert string '2014-02-11T11:30:30' to date:
     * var result = toDate('2014-02-11T11:30:30')
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert string '+02014101' to date,
     * // if the additional number of digits in the extended year format is 1:
     * var result = toDate('+02014101', {additionalDigits: 1})
     * //=> Fri Apr 11 2014 00:00:00
     */
    function toDate$1(argument, dirtyOptions) {
      if (arguments.length < 1) {
        throw new TypeError(
          '1 argument required, but only ' + arguments.length + ' present'
        )
      }

      if (argument === null) {
        return new Date(NaN)
      }

      var options = dirtyOptions || {};

      var additionalDigits =
        options.additionalDigits == null
          ? DEFAULT_ADDITIONAL_DIGITS
          : toInteger(options.additionalDigits);
      if (
        additionalDigits !== 2 &&
        additionalDigits !== 1 &&
        additionalDigits !== 0
      ) {
        throw new RangeError('additionalDigits must be 0, 1 or 2')
      }

      // Clone the date
      if (
        argument instanceof Date ||
        (typeof argument === 'object' &&
          Object.prototype.toString.call(argument) === '[object Date]')
      ) {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime())
      } else if (
        typeof argument === 'number' ||
        Object.prototype.toString.call(argument) === '[object Number]'
      ) {
        return new Date(argument)
      } else if (
        !(
          typeof argument === 'string' ||
          Object.prototype.toString.call(argument) === '[object String]'
        )
      ) {
        return new Date(NaN)
      }

      var dateStrings = splitDateString(argument);

      var parseYearResult = parseYear(dateStrings.date, additionalDigits);
      var year = parseYearResult.year;
      var restDateString = parseYearResult.restDateString;

      var date = parseDate(restDateString, year);

      if (isNaN(date)) {
        return new Date(NaN)
      }

      if (date) {
        var timestamp = date.getTime();
        var time = 0;
        var offset;

        if (dateStrings.time) {
          time = parseTime(dateStrings.time);

          if (isNaN(time)) {
            return new Date(NaN)
          }
        }

        if (dateStrings.timezone || options.timeZone) {
          offset = tzParseTimezone(
            dateStrings.timezone || options.timeZone,
            new Date(timestamp + time)
          );
          if (isNaN(offset)) {
            return new Date(NaN)
          }
        } else {
          // get offset accurate to hour in timezones that change offset
          offset = getTimezoneOffsetInMilliseconds(new Date(timestamp + time));
          offset = getTimezoneOffsetInMilliseconds(
            new Date(timestamp + time + offset)
          );
        }

        return new Date(timestamp + time + offset)
      } else {
        return new Date(NaN)
      }
    }

    function splitDateString(dateString) {
      var dateStrings = {};
      var array = dateString.split(patterns$1.dateTimeDelimeter);
      var timeString;

      if (patterns$1.plainTime.test(array[0])) {
        dateStrings.date = null;
        timeString = array[0];
      } else {
        dateStrings.date = array[0];
        timeString = array[1];
        dateStrings.timezone = array[2];
        if (patterns$1.timeZoneDelimeter.test(dateStrings.date)) {
          dateStrings.date = dateString.split(patterns$1.timeZoneDelimeter)[0];
          timeString = dateString.substr(dateStrings.date.length, dateString.length);
        }
      }

      if (timeString) {
        var token = patterns$1.timezone.exec(timeString);
        if (token) {
          dateStrings.time = timeString.replace(token[1], '');
          dateStrings.timezone = token[1];
        } else {
          dateStrings.time = timeString;
        }
      }

      return dateStrings
    }

    function parseYear(dateString, additionalDigits) {
      var patternYYY = patterns$1.YYY[additionalDigits];
      var patternYYYYY = patterns$1.YYYYY[additionalDigits];

      var token;

      // YYYY or ±YYYYY
      token = patterns$1.YYYY.exec(dateString) || patternYYYYY.exec(dateString);
      if (token) {
        var yearString = token[1];
        return {
          year: parseInt(yearString, 10),
          restDateString: dateString.slice(yearString.length)
        }
      }

      // YY or ±YYY
      token = patterns$1.YY.exec(dateString) || patternYYY.exec(dateString);
      if (token) {
        var centuryString = token[1];
        return {
          year: parseInt(centuryString, 10) * 100,
          restDateString: dateString.slice(centuryString.length)
        }
      }

      // Invalid ISO-formatted year
      return {
        year: null
      }
    }

    function parseDate(dateString, year) {
      // Invalid ISO-formatted year
      if (year === null) {
        return null
      }

      var token;
      var date;
      var month;
      var week;

      // YYYY
      if (dateString.length === 0) {
        date = new Date(0);
        date.setUTCFullYear(year);
        return date
      }

      // YYYY-MM
      token = patterns$1.MM.exec(dateString);
      if (token) {
        date = new Date(0);
        month = parseInt(token[1], 10) - 1;

        if (!validateDate(year, month)) {
          return new Date(NaN)
        }

        date.setUTCFullYear(year, month);
        return date
      }

      // YYYY-DDD or YYYYDDD
      token = patterns$1.DDD.exec(dateString);
      if (token) {
        date = new Date(0);
        var dayOfYear = parseInt(token[1], 10);

        if (!validateDayOfYearDate(year, dayOfYear)) {
          return new Date(NaN)
        }

        date.setUTCFullYear(year, 0, dayOfYear);
        return date
      }

      // yyyy-MM-dd or YYYYMMDD
      token = patterns$1.MMDD.exec(dateString);
      if (token) {
        date = new Date(0);
        month = parseInt(token[1], 10) - 1;
        var day = parseInt(token[2], 10);

        if (!validateDate(year, month, day)) {
          return new Date(NaN)
        }

        date.setUTCFullYear(year, month, day);
        return date
      }

      // YYYY-Www or YYYYWww
      token = patterns$1.Www.exec(dateString);
      if (token) {
        week = parseInt(token[1], 10) - 1;

        if (!validateWeekDate(year, week)) {
          return new Date(NaN)
        }

        return dayOfISOWeekYear(year, week)
      }

      // YYYY-Www-D or YYYYWwwD
      token = patterns$1.WwwD.exec(dateString);
      if (token) {
        week = parseInt(token[1], 10) - 1;
        var dayOfWeek = parseInt(token[2], 10) - 1;

        if (!validateWeekDate(year, week, dayOfWeek)) {
          return new Date(NaN)
        }

        return dayOfISOWeekYear(year, week, dayOfWeek)
      }

      // Invalid ISO-formatted date
      return null
    }

    function parseTime(timeString) {
      var token;
      var hours;
      var minutes;

      // hh
      token = patterns$1.HH.exec(timeString);
      if (token) {
        hours = parseFloat(token[1].replace(',', '.'));

        if (!validateTime(hours)) {
          return NaN
        }

        return (hours % 24) * MILLISECONDS_IN_HOUR$1
      }

      // hh:mm or hhmm
      token = patterns$1.HHMM.exec(timeString);
      if (token) {
        hours = parseInt(token[1], 10);
        minutes = parseFloat(token[2].replace(',', '.'));

        if (!validateTime(hours, minutes)) {
          return NaN
        }

        return (
          (hours % 24) * MILLISECONDS_IN_HOUR$1 + minutes * MILLISECONDS_IN_MINUTE$2
        )
      }

      // hh:mm:ss or hhmmss
      token = patterns$1.HHMMSS.exec(timeString);
      if (token) {
        hours = parseInt(token[1], 10);
        minutes = parseInt(token[2], 10);
        var seconds = parseFloat(token[3].replace(',', '.'));

        if (!validateTime(hours, minutes, seconds)) {
          return NaN
        }

        return (
          (hours % 24) * MILLISECONDS_IN_HOUR$1 +
          minutes * MILLISECONDS_IN_MINUTE$2 +
          seconds * 1000
        )
      }

      // Invalid ISO-formatted time
      return null
    }

    function dayOfISOWeekYear(isoWeekYear, week, day) {
      week = week || 0;
      day = day || 0;
      var date = new Date(0);
      date.setUTCFullYear(isoWeekYear, 0, 4);
      var fourthOfJanuaryDay = date.getUTCDay() || 7;
      var diff = week * 7 + day + 1 - fourthOfJanuaryDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date
    }

    // Validation functions

    var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var DAYS_IN_MONTH_LEAP_YEAR = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    function isLeapYearIndex(year) {
      return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
    }

    function validateDate(year, month, date) {
      if (month < 0 || month > 11) {
        return false
      }

      if (date != null) {
        if (date < 1) {
          return false
        }

        var isLeapYear = isLeapYearIndex(year);
        if (isLeapYear && date > DAYS_IN_MONTH_LEAP_YEAR[month]) {
          return false
        }
        if (!isLeapYear && date > DAYS_IN_MONTH[month]) {
          return false
        }
      }

      return true
    }

    function validateDayOfYearDate(year, dayOfYear) {
      if (dayOfYear < 1) {
        return false
      }

      var isLeapYear = isLeapYearIndex(year);
      if (isLeapYear && dayOfYear > 366) {
        return false
      }
      if (!isLeapYear && dayOfYear > 365) {
        return false
      }

      return true
    }

    function validateWeekDate(year, week, day) {
      if (week < 0 || week > 52) {
        return false
      }

      if (day != null && (day < 0 || day > 6)) {
        return false
      }

      return true
    }

    function validateTime(hours, minutes, seconds) {
      if (hours != null && (hours < 0 || hours >= 25)) {
        return false
      }

      if (minutes != null && (minutes < 0 || minutes >= 60)) {
        return false
      }

      if (seconds != null && (seconds < 0 || seconds >= 60)) {
        return false
      }

      return true
    }

    /**
     * @name utcToZonedTime
     * @category Time Zone Helpers
     * @summary Get a date/time representing local time in a given time zone from the UTC date
     *
     * @description
     * Returns a date instance with values representing the local time in the time zone
     * specified of the UTC time from the date provided. In other words, when the new date
     * is formatted it will show the equivalent hours in the target time zone regardless
     * of the current system time zone.
     *
     * @param {Date|String|Number} date - the date with the relevant UTC time
     * @param {String} timeZone - the time zone to get local time for, can be an offset or IANA time zone
     * @param {OptionsWithTZ} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
     * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * @returns {Date} the new date with the equivalent time in the time zone
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
     *
     * @example
     * // In June 10am UTC is 6am in New York (-04:00)
     * const result = utcToZonedTime('2014-06-25T10:00:00.000Z', 'America/New_York')
     * //=> Jun 25 2014 06:00:00
     */
    function utcToZonedTime(dirtyDate, timeZone, options) {
      var date = toDate$1(dirtyDate, options);

      // This date has the UTC time values of the input date at the system time zone
      var utcDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
      );
      // We just need to apply the offset indicated by the time zone to this localized date
      var offsetMilliseconds = tzParseTimezone(timeZone, date);

      return offsetMilliseconds
        ? subMilliseconds(utcDate, offsetMilliseconds)
        : utcDate
    }

    function assign(target, dirtyObject) {
      if (target == null) {
        throw new TypeError('assign requires that input parameter not be null or undefined');
      }

      dirtyObject = dirtyObject || {};

      for (var property in dirtyObject) {
        if (dirtyObject.hasOwnProperty(property)) {
          target[property] = dirtyObject[property];
        }
      }

      return target;
    }

    function cloneObject(dirtyObject) {
      return assign({}, dirtyObject);
    }

    /**
     * @name zonedTimeToUtc
     * @category Time Zone Helpers
     * @summary Get the UTC date/time from a date representing local time in a given time zone
     *
     * @description
     * Returns a date instance with the UTC time of the provided date of which the values
     * represented the local time in the time zone specified. In other words, if the input
     * date represented local time in time time zone, the timestamp of the output date will
     * give the equivalent UTC of that local time regardless of the current system time zone.
     *
     * @param {Date|String|Number} date - the date with values representing the local time
     * @param {String} timeZone - the time zone of this local time, can be an offset or IANA time zone
     * @param {OptionsWithTZ} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
     * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * @returns {Date} the new date with the equivalent time in the time zone
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
     *
     * @example
     * // In June 10am in Los Angeles is 5pm UTC
     * const result = zonedTimeToUtc(new Date(2014, 5, 25, 10, 0, 0), 'America/Los_Angeles')
     * //=> 2014-06-25T17:00:00.000Z
     */
    function zonedTimeToUtc(date, timeZone, options) {
      if (date instanceof Date) {
        date = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS");
      }
      var extendedOptions = cloneObject(options);
      extendedOptions.timeZone = timeZone;
      return toDate$1(date, extendedOptions)
    }

    var MILLISECONDS_IN_HOUR$2 = 3600000;
    var MILLISECONDS_IN_MINUTE$3 = 60000;
    var DEFAULT_ADDITIONAL_DIGITS$1 = 2;
    var patterns$2 = {
      dateTimeDelimiter: /[T ]/,
      timeZoneDelimiter: /[Z ]/i,
      timezone: /([Z+-].*)$/
    };
    var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
    var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
    var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
    /**
     * @name parseISO
     * @category Common Helpers
     * @summary Parse ISO string
     *
     * @description
     * Parse the given string in ISO 8601 format and return an instance of Date.
     *
     * Function accepts complete ISO 8601 formats as well as partial implementations.
     * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
     *
     * If the argument isn't a string, the function cannot parse the string or
     * the values are invalid, it returns Invalid Date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The previous `parse` implementation was renamed to `parseISO`.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   parse('2016-01-01')
     *
     *   // v2.0.0 onward
     *   parseISO('2016-01-01')
     *   ```
     *
     * - `parseISO` now validates separate date and time values in ISO-8601 strings
     *   and returns `Invalid Date` if the date is invalid.
     *
     *   ```javascript
     *   parseISO('2018-13-32')
     *   //=> Invalid Date
     *   ```
     *
     * - `parseISO` now doesn't fall back to `new Date` constructor
     *   if it fails to parse a string argument. Instead, it returns `Invalid Date`.
     *
     * @param {String} argument - the value to convert
     * @param {Object} [options] - an object with options.
     * @param {0|1|2} [options.additionalDigits=2] - the additional number of digits in the extended year format
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
     *
     * @example
     * // Convert string '2014-02-11T11:30:30' to date:
     * var result = parseISO('2014-02-11T11:30:30')
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert string '+02014101' to date,
     * // if the additional number of digits in the extended year format is 1:
     * var result = parseISO('+02014101', { additionalDigits: 1 })
     * //=> Fri Apr 11 2014 00:00:00
     */

    function parseISO(argument, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var additionalDigits = options.additionalDigits == null ? DEFAULT_ADDITIONAL_DIGITS$1 : toInteger(options.additionalDigits);

      if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
        throw new RangeError('additionalDigits must be 0, 1 or 2');
      }

      if (!(typeof argument === 'string' || Object.prototype.toString.call(argument) === '[object String]')) {
        return new Date(NaN);
      }

      var dateStrings = splitDateString$1(argument);
      var date;

      if (dateStrings.date) {
        var parseYearResult = parseYear$1(dateStrings.date, additionalDigits);
        date = parseDate$1(parseYearResult.restDateString, parseYearResult.year);
      }

      if (isNaN(date) || !date) {
        return new Date(NaN);
      }

      var timestamp = date.getTime();
      var time = 0;
      var offset;

      if (dateStrings.time) {
        time = parseTime$1(dateStrings.time);

        if (isNaN(time) || time === null) {
          return new Date(NaN);
        }
      }

      if (dateStrings.timezone) {
        offset = parseTimezone(dateStrings.timezone);

        if (isNaN(offset)) {
          return new Date(NaN);
        }
      } else {
        var dirtyDate = new Date(timestamp + time); // js parsed string assuming it's in UTC timezone
        // but we need it to be parsed in our timezone
        // so we use utc values to build date in our timezone.
        // Year values from 0 to 99 map to the years 1900 to 1999
        // so set year explicitly with setFullYear.

        var result = new Date(dirtyDate.getUTCFullYear(), dirtyDate.getUTCMonth(), dirtyDate.getUTCDate(), dirtyDate.getUTCHours(), dirtyDate.getUTCMinutes(), dirtyDate.getUTCSeconds(), dirtyDate.getUTCMilliseconds());
        result.setFullYear(dirtyDate.getUTCFullYear());
        return result;
      }

      return new Date(timestamp + time + offset);
    }

    function splitDateString$1(dateString) {
      var dateStrings = {};
      var array = dateString.split(patterns$2.dateTimeDelimiter);
      var timeString;

      if (/:/.test(array[0])) {
        dateStrings.date = null;
        timeString = array[0];
      } else {
        dateStrings.date = array[0];
        timeString = array[1];

        if (patterns$2.timeZoneDelimiter.test(dateStrings.date)) {
          dateStrings.date = dateString.split(patterns$2.timeZoneDelimiter)[0];
          timeString = dateString.substr(dateStrings.date.length, dateString.length);
        }
      }

      if (timeString) {
        var token = patterns$2.timezone.exec(timeString);

        if (token) {
          dateStrings.time = timeString.replace(token[1], '');
          dateStrings.timezone = token[1];
        } else {
          dateStrings.time = timeString;
        }
      }

      return dateStrings;
    }

    function parseYear$1(dateString, additionalDigits) {
      var regex = new RegExp('^(?:(\\d{4}|[+-]\\d{' + (4 + additionalDigits) + '})|(\\d{2}|[+-]\\d{' + (2 + additionalDigits) + '})$)');
      var captures = dateString.match(regex); // Invalid ISO-formatted year

      if (!captures) return {
        year: null
      };
      var year = captures[1] && parseInt(captures[1]);
      var century = captures[2] && parseInt(captures[2]);
      return {
        year: century == null ? year : century * 100,
        restDateString: dateString.slice((captures[1] || captures[2]).length)
      };
    }

    function parseDate$1(dateString, year) {
      // Invalid ISO-formatted year
      if (year === null) return null;
      var captures = dateString.match(dateRegex); // Invalid ISO-formatted string

      if (!captures) return null;
      var isWeekDate = !!captures[4];
      var dayOfYear = parseDateUnit(captures[1]);
      var month = parseDateUnit(captures[2]) - 1;
      var day = parseDateUnit(captures[3]);
      var week = parseDateUnit(captures[4]);
      var dayOfWeek = parseDateUnit(captures[5]) - 1;

      if (isWeekDate) {
        if (!validateWeekDate$1(year, week, dayOfWeek)) {
          return new Date(NaN);
        }

        return dayOfISOWeekYear$1(year, week, dayOfWeek);
      } else {
        var date = new Date(0);

        if (!validateDate$1(year, month, day) || !validateDayOfYearDate$1(year, dayOfYear)) {
          return new Date(NaN);
        }

        date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
        return date;
      }
    }

    function parseDateUnit(value) {
      return value ? parseInt(value) : 1;
    }

    function parseTime$1(timeString) {
      var captures = timeString.match(timeRegex);
      if (!captures) return null; // Invalid ISO-formatted time

      var hours = parseTimeUnit(captures[1]);
      var minutes = parseTimeUnit(captures[2]);
      var seconds = parseTimeUnit(captures[3]);

      if (!validateTime$1(hours, minutes, seconds)) {
        return NaN;
      }

      return hours * MILLISECONDS_IN_HOUR$2 + minutes * MILLISECONDS_IN_MINUTE$3 + seconds * 1000;
    }

    function parseTimeUnit(value) {
      return value && parseFloat(value.replace(',', '.')) || 0;
    }

    function parseTimezone(timezoneString) {
      if (timezoneString === 'Z') return 0;
      var captures = timezoneString.match(timezoneRegex);
      if (!captures) return 0;
      var sign = captures[1] === '+' ? -1 : 1;
      var hours = parseInt(captures[2]);
      var minutes = captures[3] && parseInt(captures[3]) || 0;

      if (!validateTimezone$1(hours, minutes)) {
        return NaN;
      }

      return sign * (hours * MILLISECONDS_IN_HOUR$2 + minutes * MILLISECONDS_IN_MINUTE$3);
    }

    function dayOfISOWeekYear$1(isoWeekYear, week, day) {
      var date = new Date(0);
      date.setUTCFullYear(isoWeekYear, 0, 4);
      var fourthOfJanuaryDay = date.getUTCDay() || 7;
      var diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    } // Validation functions
    // February is null to handle the leap year (using ||)


    var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    function isLeapYearIndex$1(year) {
      return year % 400 === 0 || year % 4 === 0 && year % 100;
    }

    function validateDate$1(year, month, date) {
      return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex$1(year) ? 29 : 28));
    }

    function validateDayOfYearDate$1(year, dayOfYear) {
      return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex$1(year) ? 366 : 365);
    }

    function validateWeekDate$1(_year, week, day) {
      return week >= 1 && week <= 53 && day >= 0 && day <= 6;
    }

    function validateTime$1(hours, minutes, seconds) {
      if (hours === 24) {
        return minutes === 0 && seconds === 0;
      }

      return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
    }

    function validateTimezone$1(_hours, minutes) {
      return minutes >= 0 && minutes <= 59;
    }

    /* demo/Demo.svelte generated by Svelte v3.25.0 */

    const { Object: Object_1$1 } = globals;
    const file$1 = "demo/Demo.svelte";

    // (36:2) {#if Object.keys(payload).length}
    function create_if_block$1(ctx) {
    	let pre;
    	let t0_value = JSON.stringify(/*payload*/ ctx[0], null, 2) + "";
    	let t0;
    	let t1;
    	let p0;
    	let t2;
    	let t3_value = format(/*payload*/ ctx[0].zonedDatetime, "MMMM do, yyyy', ' HH:mm aaaa") + "";
    	let t3;
    	let t4;
    	let t5_value = /*payload*/ ctx[0].timezone + "";
    	let t5;
    	let t6;
    	let t7;
    	let p1;
    	let t8;
    	let t9_value = format(/*payload*/ ctx[0].utcDatetime, "MMMM do, yyyy 'at' HH:mm aaaa") + "";
    	let t9;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t0 = text(t0_value);
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Local time: ");
    			t3 = text(t3_value);
    			t4 = text(" in ");
    			t5 = text(t5_value);
    			t6 = text(".");
    			t7 = space();
    			p1 = element("p");
    			t8 = text("UTC: ");
    			t9 = text(t9_value);
    			attr_dev(pre, "class", "svelte-1rvm9r5");
    			add_location(pre, file$1, 36, 4, 1153);
    			attr_dev(p0, "class", "svelte-1rvm9r5");
    			add_location(p0, file$1, 37, 4, 1203);
    			attr_dev(p1, "class", "svelte-1rvm9r5");
    			add_location(p1, file$1, 40, 4, 1325);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(p0, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*payload*/ 1 && t0_value !== (t0_value = JSON.stringify(/*payload*/ ctx[0], null, 2) + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*payload*/ 1 && t3_value !== (t3_value = format(/*payload*/ ctx[0].zonedDatetime, "MMMM do, yyyy', ' HH:mm aaaa") + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*payload*/ 1 && t5_value !== (t5_value = /*payload*/ ctx[0].timezone + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*payload*/ 1 && t9_value !== (t9_value = format(/*payload*/ ctx[0].utcDatetime, "MMMM do, yyyy 'at' HH:mm aaaa") + "")) set_data_dev(t9, t9_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(36:2) {#if Object.keys(payload).length}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div6;
    	let div4;
    	let div3;
    	let div0;
    	let p0;
    	let t1;
    	let picker0;
    	let t2;
    	let div1;
    	let p1;
    	let t4;
    	let picker1;
    	let t5;
    	let div2;
    	let p2;
    	let t7;
    	let picker2;
    	let t8;
    	let div5;
    	let p3;
    	let t10;
    	let show_if = Object.keys(/*payload*/ ctx[0]).length;
    	let current;
    	picker0 = new Picker({ $$inline: true });
    	picker0.$on("update", /*update*/ ctx[3]);

    	picker1 = new Picker({
    			props: { timezone: "Europe/London" },
    			$$inline: true
    		});

    	picker1.$on("update", /*update*/ ctx[3]);

    	picker2 = new Picker({
    			props: {
    				timezone: "Asia/Istanbul",
    				allowedTimezones: /*allowedTimezones*/ ctx[2]
    			},
    			$$inline: true
    		});

    	picker2.$on("update", /*update*/ ctx[3]);
    	let if_block = show_if && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "With defaults";
    			t1 = space();
    			create_component(picker0.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "With timezone";
    			t4 = space();
    			create_component(picker1.$$.fragment);
    			t5 = space();
    			div2 = element("div");
    			p2 = element("p");
    			p2.textContent = "With timezone and list of allowed timezones";
    			t7 = space();
    			create_component(picker2.$$.fragment);
    			t8 = space();
    			div5 = element("div");
    			p3 = element("p");
    			p3.textContent = `${parseISO(/*datetime*/ ctx[1])}`;
    			t10 = space();
    			if (if_block) if_block.c();
    			attr_dev(p0, "class", "svelte-1rvm9r5");
    			add_location(p0, file$1, 20, 8, 649);
    			attr_dev(div0, "class", "col bg svelte-1rvm9r5");
    			add_location(div0, file$1, 19, 6, 620);
    			attr_dev(p1, "class", "svelte-1rvm9r5");
    			add_location(p1, file$1, 24, 8, 758);
    			attr_dev(div1, "class", "col bg svelte-1rvm9r5");
    			add_location(div1, file$1, 23, 6, 729);
    			attr_dev(p2, "class", "svelte-1rvm9r5");
    			add_location(p2, file$1, 28, 8, 892);
    			attr_dev(div2, "class", "col bg svelte-1rvm9r5");
    			add_location(div2, file$1, 27, 6, 863);
    			attr_dev(div3, "class", "rows svelte-1rvm9r5");
    			add_location(div3, file$1, 18, 4, 595);
    			attr_dev(div4, "class", "col svelte-1rvm9r5");
    			add_location(div4, file$1, 17, 2, 573);
    			attr_dev(p3, "class", "svelte-1rvm9r5");
    			add_location(p3, file$1, 34, 2, 1085);
    			attr_dev(div5, "class", "col bg svelte-1rvm9r5");
    			add_location(div5, file$1, 33, 2, 1062);
    			attr_dev(div6, "class", "cols svelte-1rvm9r5");
    			add_location(div6, file$1, 16, 0, 552);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			mount_component(picker0, div0, null);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, p1);
    			append_dev(div1, t4);
    			mount_component(picker1, div1, null);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, p2);
    			append_dev(div2, t7);
    			mount_component(picker2, div2, null);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			append_dev(div5, p3);
    			append_dev(div5, t10);
    			if (if_block) if_block.m(div5, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*payload*/ 1) show_if = Object.keys(/*payload*/ ctx[0]).length;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div5, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(picker0.$$.fragment, local);
    			transition_in(picker1.$$.fragment, local);
    			transition_in(picker2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(picker0.$$.fragment, local);
    			transition_out(picker1.$$.fragment, local);
    			transition_out(picker2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(picker0);
    			destroy_component(picker1);
    			destroy_component(picker2);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Demo", slots, []);
    	let datetime = "2020-09-15T10:00";
    	let allowedTimezones = ["Europe/London", "Africa/Abidjan", "Asia/Istanbul"];
    	let payload = {};

    	const update = ev => {
    		$$invalidate(0, payload.timezone = ev.detail.timezone, payload);
    		$$invalidate(0, payload.utcDatetime = zonedTimeToUtc(parseISO(datetime), payload.timezone), payload);
    		$$invalidate(0, payload.zonedDatetime = utcToZonedTime(payload.utcDatetime, payload.timezone), payload);
    	};

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Demo> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Picker,
    		utcToZonedTime,
    		zonedTimeToUtc,
    		format,
    		parseISO,
    		datetime,
    		allowedTimezones,
    		payload,
    		update
    	});

    	$$self.$inject_state = $$props => {
    		if ("datetime" in $$props) $$invalidate(1, datetime = $$props.datetime);
    		if ("allowedTimezones" in $$props) $$invalidate(2, allowedTimezones = $$props.allowedTimezones);
    		if ("payload" in $$props) $$invalidate(0, payload = $$props.payload);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [payload, datetime, allowedTimezones, update];
    }

    class Demo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Demo",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new Demo({ target: document.getElementById('root') });

    return app;

}());
//# sourceMappingURL=bundle.js.map
