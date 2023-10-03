var app = (function () {
    'use strict';

    function noop() { }
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
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
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* webviews\components\GoPro\FAQ\FAQBox\FAQBox.svelte generated by Svelte v3.43.1 */

    const file$3 = "webviews\\components\\GoPro\\FAQ\\FAQBox\\FAQBox.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let hr;
    	let t0;
    	let h3;
    	let t1;
    	let t2;
    	let p;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			hr = element("hr");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text(/*question*/ ctx[0]);
    			t2 = space();
    			p = element("p");
    			t3 = text(/*answer*/ ctx[1]);
    			attr_dev(hr, "class", "faq__upper-border svelte-q2sh0p");
    			add_location(hr, file$3, 6, 2, 111);
    			attr_dev(h3, "class", "faq__question svelte-q2sh0p");
    			add_location(h3, file$3, 7, 2, 147);
    			attr_dev(p, "class", "faq__answer svelte-q2sh0p");
    			add_location(p, file$3, 8, 2, 192);
    			attr_dev(div, "class", "faq__box");
    			add_location(div, file$3, 5, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, hr);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			append_dev(h3, t1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*question*/ 1) set_data_dev(t1, /*question*/ ctx[0]);
    			if (dirty & /*answer*/ 2) set_data_dev(t3, /*answer*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FAQBox', slots, []);
    	let { question = "N/A" } = $$props;
    	let { answer = "N/A" } = $$props;
    	const writable_props = ['question', 'answer'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FAQBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('question' in $$props) $$invalidate(0, question = $$props.question);
    		if ('answer' in $$props) $$invalidate(1, answer = $$props.answer);
    	};

    	$$self.$capture_state = () => ({ question, answer });

    	$$self.$inject_state = $$props => {
    		if ('question' in $$props) $$invalidate(0, question = $$props.question);
    		if ('answer' in $$props) $$invalidate(1, answer = $$props.answer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [question, answer];
    }

    class FAQBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { question: 0, answer: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FAQBox",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get question() {
    		throw new Error("<FAQBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set question(value) {
    		throw new Error("<FAQBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get answer() {
    		throw new Error("<FAQBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answer(value) {
    		throw new Error("<FAQBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\GoPro\FAQ\FAQ.svelte generated by Svelte v3.43.1 */
    const file$2 = "webviews\\components\\GoPro\\FAQ\\FAQ.svelte";

    function create_fragment$2(ctx) {
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let div;
    	let faqbox0;
    	let t4;
    	let faqbox1;
    	let t5;
    	let faqbox2;
    	let t6;
    	let faqbox3;
    	let t7;
    	let faqbox4;
    	let t8;
    	let faqbox5;
    	let t9;
    	let faqbox6;
    	let t10;
    	let faqbox7;
    	let t11;
    	let faqbox8;
    	let t12;
    	let faqbox9;
    	let t13;
    	let faqbox10;
    	let t14;
    	let faqbox11;
    	let t15;
    	let faqbox12;
    	let t16;
    	let faqbox13;
    	let current;

    	faqbox0 = new FAQBox({
    			props: {
    				question: "What is blox?",
    				answer: "blox is a one-of-a-kind VS code extension that provides developers with\r\n      1500 code blocks (1100 available now) from different UI categories of Web\r\n      Application, Ecommerce and Marketing. blox allows devs to fast track their\r\n      workflow and increase productivity all while maintaining the highest\r\n      development standards with drop-in-ready code blocks."
    			},
    			$$inline: true
    		});

    	faqbox1 = new FAQBox({
    			props: {
    				question: "Who is it for?",
    				answer: "blox is for savvy front-end and back-end devs who are looking to speed up their process of developing UIs or just devs who simply want to save their precious everyday development hours."
    			},
    			$$inline: true
    		});

    	faqbox2 = new FAQBox({
    			props: {
    				question: "Who is behind blox?",
    				answer: "blox is maintained by a team of expert designers, veteran front-end devs, and battle-tested QA specialists, all dedicated towards making the developer experience as seamless as it gets"
    			},
    			$$inline: true
    		});

    	faqbox3 = new FAQBox({
    			props: {
    				question: "What Javascript Frameworks are supported?",
    				answer: "The currently supported Javascript frameworks include React, Angular & Vue. Do keep an eye out because more are on their way"
    			},
    			$$inline: true
    		});

    	faqbox4 = new FAQBox({
    			props: {
    				question: "What CSS Frameworks are supported?",
    				answer: "During early access, all the code blocks will support Tailwind CSS but more frameworks like Bootstrap, Material UI & Svelte will also be added in the future."
    			},
    			$$inline: true
    		});

    	faqbox5 = new FAQBox({
    			props: {
    				question: "What are the plans for Bootstrap support?",
    				answer: "Bootstrap code blocks are already in our roadmap and our team is working hard to bring it on board for Bootstrap developers ASAP."
    			},
    			$$inline: true
    		});

    	faqbox6 = new FAQBox({
    			props: {
    				question: "Do the code blocks come with baked-in Integrations & Interactions?",
    				answer: "Yes, currently all of our code blocks come with Integrations & Interactions supported for React, Angular, and Vue. We're working on Integration & Interaction support for other JS frameworks as well which will be relased soon via weekly updates."
    			},
    			$$inline: true
    		});

    	faqbox7 = new FAQBox({
    			props: {
    				question: "What do you mean by `Early Access`?",
    				answer: "While blox comes pre-loaded with a large number of premium code blocks, the extension is still in its early access program which means that the team of designers and developers are planning on releasing more code blocks with support for many other developer favourite frameworks like MaterialUI, Booststrap, Alpine.js & many more. The main benefit of purchasing the license in Early acces is that all the upcoming updates will be provided free of charge to our early access customers"
    			},
    			$$inline: true
    		});

    	faqbox8 = new FAQBox({
    			props: {
    				question: "Where will I get all the updates?",
    				answer: "Our news and updates are mainly published via email. Furthermore, we keep the blox family in the loop regarding all the happenings through our discord community."
    			},
    			$$inline: true
    		});

    	faqbox9 = new FAQBox({
    			props: {
    				question: "Am I authorized to use the code blocks in client projects?",
    				answer: "Yes, you are authorized to use blox's code to make numerous products for yourself or your customers. You may also sell your finished product."
    			},
    			$$inline: true
    		});

    	faqbox10 = new FAQBox({
    			props: {
    				question: "What can't I do?",
    				answer: "The code blocks cannot be redistributed or sold as stock items. The same goes either with a tool, template, or source files. You can't do all this with a code block individuallly or bundled with other code blocks. You can't make the code block available for purchasing as-is or with abstract tailoring."
    			},
    			$$inline: true
    		});

    	faqbox11 = new FAQBox({
    			props: {
    				question: "Does blox offer a trial?",
    				answer: "Yes, after installing the extension, you have access to 250 free code blocks from different UI categories. Give them a try, and for more, head over to the Pro membership of the extension to access the library of 1500 components (1100 available now)."
    			},
    			$$inline: true
    		});

    	faqbox12 = new FAQBox({
    			props: {
    				question: "Does blox Pro have a refund policy?",
    				answer: "We guarantee you that our product works exactly the way it claims. If you don't agree with us in any case and have a substantial explanation for specific reasons, we're glad to send you a refund through Stripe within seven days of your buy. Send us an email at support@vsblox.com"
    			},
    			$$inline: true
    		});

    	faqbox13 = new FAQBox({
    			props: {
    				question: "I want a license for my whole team. What should I do?",
    				answer: "To get access to blox for your entire team contact our support at support@vsblox.com"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Frequently Asked Questions";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Get all your blox related queries answered";
    			t3 = space();
    			div = element("div");
    			create_component(faqbox0.$$.fragment);
    			t4 = space();
    			create_component(faqbox1.$$.fragment);
    			t5 = space();
    			create_component(faqbox2.$$.fragment);
    			t6 = space();
    			create_component(faqbox3.$$.fragment);
    			t7 = space();
    			create_component(faqbox4.$$.fragment);
    			t8 = space();
    			create_component(faqbox5.$$.fragment);
    			t9 = space();
    			create_component(faqbox6.$$.fragment);
    			t10 = space();
    			create_component(faqbox7.$$.fragment);
    			t11 = space();
    			create_component(faqbox8.$$.fragment);
    			t12 = space();
    			create_component(faqbox9.$$.fragment);
    			t13 = space();
    			create_component(faqbox10.$$.fragment);
    			t14 = space();
    			create_component(faqbox11.$$.fragment);
    			t15 = space();
    			create_component(faqbox12.$$.fragment);
    			t16 = space();
    			create_component(faqbox13.$$.fragment);
    			attr_dev(h2, "class", "heading-2 svelte-nzjjyp");
    			add_location(h2, file$2, 4, 0, 71);
    			attr_dev(p, "class", "faq__subtitle svelte-nzjjyp");
    			add_location(p, file$2, 5, 0, 126);
    			attr_dev(div, "class", "faqs svelte-nzjjyp");
    			add_location(div, file$2, 6, 0, 199);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(faqbox0, div, null);
    			append_dev(div, t4);
    			mount_component(faqbox1, div, null);
    			append_dev(div, t5);
    			mount_component(faqbox2, div, null);
    			append_dev(div, t6);
    			mount_component(faqbox3, div, null);
    			append_dev(div, t7);
    			mount_component(faqbox4, div, null);
    			append_dev(div, t8);
    			mount_component(faqbox5, div, null);
    			append_dev(div, t9);
    			mount_component(faqbox6, div, null);
    			append_dev(div, t10);
    			mount_component(faqbox7, div, null);
    			append_dev(div, t11);
    			mount_component(faqbox8, div, null);
    			append_dev(div, t12);
    			mount_component(faqbox9, div, null);
    			append_dev(div, t13);
    			mount_component(faqbox10, div, null);
    			append_dev(div, t14);
    			mount_component(faqbox11, div, null);
    			append_dev(div, t15);
    			mount_component(faqbox12, div, null);
    			append_dev(div, t16);
    			mount_component(faqbox13, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(faqbox0.$$.fragment, local);
    			transition_in(faqbox1.$$.fragment, local);
    			transition_in(faqbox2.$$.fragment, local);
    			transition_in(faqbox3.$$.fragment, local);
    			transition_in(faqbox4.$$.fragment, local);
    			transition_in(faqbox5.$$.fragment, local);
    			transition_in(faqbox6.$$.fragment, local);
    			transition_in(faqbox7.$$.fragment, local);
    			transition_in(faqbox8.$$.fragment, local);
    			transition_in(faqbox9.$$.fragment, local);
    			transition_in(faqbox10.$$.fragment, local);
    			transition_in(faqbox11.$$.fragment, local);
    			transition_in(faqbox12.$$.fragment, local);
    			transition_in(faqbox13.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(faqbox0.$$.fragment, local);
    			transition_out(faqbox1.$$.fragment, local);
    			transition_out(faqbox2.$$.fragment, local);
    			transition_out(faqbox3.$$.fragment, local);
    			transition_out(faqbox4.$$.fragment, local);
    			transition_out(faqbox5.$$.fragment, local);
    			transition_out(faqbox6.$$.fragment, local);
    			transition_out(faqbox7.$$.fragment, local);
    			transition_out(faqbox8.$$.fragment, local);
    			transition_out(faqbox9.$$.fragment, local);
    			transition_out(faqbox10.$$.fragment, local);
    			transition_out(faqbox11.$$.fragment, local);
    			transition_out(faqbox12.$$.fragment, local);
    			transition_out(faqbox13.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div);
    			destroy_component(faqbox0);
    			destroy_component(faqbox1);
    			destroy_component(faqbox2);
    			destroy_component(faqbox3);
    			destroy_component(faqbox4);
    			destroy_component(faqbox5);
    			destroy_component(faqbox6);
    			destroy_component(faqbox7);
    			destroy_component(faqbox8);
    			destroy_component(faqbox9);
    			destroy_component(faqbox10);
    			destroy_component(faqbox11);
    			destroy_component(faqbox12);
    			destroy_component(faqbox13);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FAQ', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FAQ> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ FAQBox });
    	return [];
    }

    class FAQ extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FAQ",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* webviews\components\GoPro\GoProCard\GoProCard.svelte generated by Svelte v3.43.1 */

    const file$1 = "webviews\\components\\GoPro\\GoProCard\\GoProCard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (27:2) {#if showBillingType}
    function create_if_block_4(ctx) {
    	let div;
    	let button0;
    	let t0;
    	let button0_class_value;
    	let t1;
    	let button1;
    	let t2;
    	let button1_class_value;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			t0 = text("Monthly");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("One Time");

    			attr_dev(button0, "class", button0_class_value = "" + (null_to_empty(`billing__type ${/*billingType*/ ctx[1] === "monthly"
			? `billing__type--selected ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
				? "billing__type--selected-active"
				: ""}`
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(button0, file$1, 32, 6, 783);

    			attr_dev(button1, "class", button1_class_value = "" + (null_to_empty(`billing__type ${/*billingType*/ ctx[1] === "one-time"
			? `billing__type--selected ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
				? "billing__type--selected-active"
				: ""}`
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(button1, file$1, 42, 6, 1124);

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`billing__tab ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "billing__tab-active"
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(div, file$1, 27, 4, 662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(button0, t0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*billingType, selected, purchased*/ 7 && button0_class_value !== (button0_class_value = "" + (null_to_empty(`billing__type ${/*billingType*/ ctx[1] === "monthly"
			? `billing__type--selected ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
				? "billing__type--selected-active"
				: ""}`
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*billingType, selected, purchased*/ 7 && button1_class_value !== (button1_class_value = "" + (null_to_empty(`billing__type ${/*billingType*/ ctx[1] === "one-time"
			? `billing__type--selected ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
				? "billing__type--selected-active"
				: ""}`
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*selected, purchased*/ 5 && div_class_value !== (div_class_value = "" + (null_to_empty(`billing__tab ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "billing__tab-active"
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(27:2) {#if showBillingType}",
    		ctx
    	});

    	return block;
    }

    // (55:2) {#if isAddon}
    function create_if_block_3(ctx) {
    	let div;
    	let t;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("One time payment");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`card__payment-type ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "card__payment-type-active"
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(div, file$1, 55, 4, 1504);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected, purchased*/ 5 && div_class_value !== (div_class_value = "" + (null_to_empty(`card__payment-type ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "card__payment-type-active"
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(55:2) {#if isAddon}",
    		ctx
    	});

    	return block;
    }

    // (70:4) {#if actualPrice}
    function create_if_block_2(ctx) {
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("$");
    			t1 = text(/*actualPrice*/ ctx[6]);
    			attr_dev(span, "class", "card__actual-price svelte-1ar8p9u");
    			add_location(span, file$1, 70, 6, 1879);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*actualPrice*/ 64) set_data_dev(t1, /*actualPrice*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(70:4) {#if actualPrice}",
    		ctx
    	});

    	return block;
    }

    // (75:4) {#each features as feature}
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let svg;
    	let circle;
    	let path;
    	let div0_class_value;
    	let t0;
    	let t1_value = /*feature*/ ctx[14] + "";
    	let t1;
    	let t2;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(circle, "cx", "6");
    			attr_dev(circle, "cy", "6");
    			attr_dev(circle, "r", "6");
    			attr_dev(circle, "class", "svelte-1ar8p9u");
    			add_location(circle, file$1, 90, 12, 2452);
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "clip-rule", "evenodd");
    			attr_dev(path, "d", "M8.98511 3.96774L5.0168 8.50295L3.01392 6.50007L3.50005 6.01394L4.98331 7.49719L8.46771 3.51501L8.98511 3.96774Z");
    			attr_dev(path, "class", "svelte-1ar8p9u");
    			add_location(path, file$1, 91, 12, 2496);
    			attr_dev(svg, "width", "12");
    			attr_dev(svg, "height", "12");
    			attr_dev(svg, "viewBox", "0 0 12 12");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-1ar8p9u");
    			add_location(svg, file$1, 83, 10, 2266);

    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(`icon-complete ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "icon-complete-active"
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(div0, file$1, 78, 8, 2123);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(`feature ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "feature__selected"
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(div1, file$1, 75, 6, 2021);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, circle);
    			append_dev(svg, path);
    			append_dev(div1, t0);
    			append_dev(div1, t1);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected, purchased*/ 5 && div0_class_value !== (div0_class_value = "" + (null_to_empty(`icon-complete ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "icon-complete-active"
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*features*/ 128 && t1_value !== (t1_value = /*feature*/ ctx[14] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*selected, purchased*/ 5 && div1_class_value !== (div1_class_value = "" + (null_to_empty(`feature ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "feature__selected"
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(75:4) {#each features as feature}",
    		ctx
    	});

    	return block;
    }

    // (111:2) {:else}
    function create_else_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Purchased";
    			attr_dev(span, "class", "card__purchased svelte-1ar8p9u");
    			add_location(span, file$1, 111, 4, 3033);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(111:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (103:2) {#if !purchased}
    function create_if_block$1(ctx) {
    	let button;
    	let button_class_value;

    	function select_block_type_1(ctx, dirty) {
    		if (/*selected*/ ctx[0]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(`card__button ${/*selected*/ ctx[0] ? "card__button-selected" : ""}`) + " svelte-1ar8p9u"));
    			add_location(button, file$1, 103, 4, 2835);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			if_block.m(button, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}

    			if (dirty & /*selected*/ 1 && button_class_value !== (button_class_value = "" + (null_to_empty(`card__button ${/*selected*/ ctx[0] ? "card__button-selected" : ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(103:2) {#if !purchased}",
    		ctx
    	});

    	return block;
    }

    // (107:6) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Select License");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(107:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (105:6) {#if selected}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Selected");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(105:6) {#if selected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let t0;
    	let t1;
    	let h3;
    	let t2;
    	let t3;
    	let p;
    	let t4;
    	let t5;
    	let div0;
    	let span;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let div1;
    	let t10;
    	let div2_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showBillingType*/ ctx[8] && create_if_block_4(ctx);
    	let if_block1 = /*isAddon*/ ctx[9] && create_if_block_3(ctx);
    	let if_block2 = /*actualPrice*/ ctx[6] && create_if_block_2(ctx);
    	let each_value = /*features*/ ctx[7];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (!/*purchased*/ ctx[2]) return create_if_block$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block3 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			h3 = element("h3");
    			t2 = text(/*title*/ ctx[3]);
    			t3 = space();
    			p = element("p");
    			t4 = text(/*subtitle*/ ctx[4]);
    			t5 = space();
    			div0 = element("div");
    			span = element("span");
    			t6 = text("$");
    			t7 = text(/*salePrice*/ ctx[5]);
    			t8 = space();
    			if (if_block2) if_block2.c();
    			t9 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t10 = space();
    			if_block3.c();
    			attr_dev(h3, "class", "card__title svelte-1ar8p9u");
    			add_location(h3, file$1, 63, 2, 1678);
    			attr_dev(p, "class", "card__subtitle svelte-1ar8p9u");
    			add_location(p, file$1, 66, 2, 1728);
    			attr_dev(span, "class", "card__sale-price svelte-1ar8p9u");
    			add_location(span, file$1, 68, 4, 1798);
    			attr_dev(div0, "class", "prices svelte-1ar8p9u");
    			add_location(div0, file$1, 67, 2, 1772);
    			attr_dev(div1, "class", "features svelte-1ar8p9u");
    			add_location(div1, file$1, 73, 2, 1958);

    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty(`card ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "card--selected"
			: ""}`) + " svelte-1ar8p9u"));

    			add_location(div2, file$1, 22, 0, 527);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t0);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, h3);
    			append_dev(h3, t2);
    			append_dev(div2, t3);
    			append_dev(div2, p);
    			append_dev(p, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(span, t6);
    			append_dev(span, t7);
    			append_dev(div0, t8);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div2, t9);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div2, t10);
    			if_block3.m(div2, null);

    			if (!mounted) {
    				dispose = listen_dev(div2, "click", /*toggleSelection*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showBillingType*/ ctx[8]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div2, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*isAddon*/ ctx[9]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div2, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*title*/ 8) set_data_dev(t2, /*title*/ ctx[3]);
    			if (dirty & /*subtitle*/ 16) set_data_dev(t4, /*subtitle*/ ctx[4]);
    			if (dirty & /*salePrice*/ 32) set_data_dev(t7, /*salePrice*/ ctx[5]);

    			if (/*actualPrice*/ ctx[6]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*selected, purchased, features*/ 133) {
    				each_value = /*features*/ ctx[7];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div2, null);
    				}
    			}

    			if (dirty & /*selected, purchased*/ 5 && div2_class_value !== (div2_class_value = "" + (null_to_empty(`card ${/*selected*/ ctx[0] || /*purchased*/ ctx[2]
			? "card--selected"
			: ""}`) + " svelte-1ar8p9u"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			if_block3.d();
    			mounted = false;
    			dispose();
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
    	validate_slots('GoProCard', slots, []);
    	let { purchased = false } = $$props;
    	let { title = "N/A" } = $$props;
    	let { subtitle = "N/A" } = $$props;
    	let { salePrice = "N/A" } = $$props;
    	let { actualPrice = null } = $$props;
    	let { features = [] } = $$props;
    	let { selected = false } = $$props;
    	let { billingType = "monthly" } = $$props;
    	let { showBillingType = false } = $$props;
    	let { isAddon = false } = $$props;

    	const toggleSelection = () => {
    		$$invalidate(0, selected = !selected);
    	};

    	const toggleBillingType = (e, type) => {
    		e.stopPropagation();
    		$$invalidate(1, billingType = type);
    	};

    	const writable_props = [
    		'purchased',
    		'title',
    		'subtitle',
    		'salePrice',
    		'actualPrice',
    		'features',
    		'selected',
    		'billingType',
    		'showBillingType',
    		'isAddon'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GoProCard> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => toggleBillingType(e, "monthly");
    	const click_handler_1 = e => toggleBillingType(e, "one-time");

    	$$self.$$set = $$props => {
    		if ('purchased' in $$props) $$invalidate(2, purchased = $$props.purchased);
    		if ('title' in $$props) $$invalidate(3, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(4, subtitle = $$props.subtitle);
    		if ('salePrice' in $$props) $$invalidate(5, salePrice = $$props.salePrice);
    		if ('actualPrice' in $$props) $$invalidate(6, actualPrice = $$props.actualPrice);
    		if ('features' in $$props) $$invalidate(7, features = $$props.features);
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    		if ('billingType' in $$props) $$invalidate(1, billingType = $$props.billingType);
    		if ('showBillingType' in $$props) $$invalidate(8, showBillingType = $$props.showBillingType);
    		if ('isAddon' in $$props) $$invalidate(9, isAddon = $$props.isAddon);
    	};

    	$$self.$capture_state = () => ({
    		purchased,
    		title,
    		subtitle,
    		salePrice,
    		actualPrice,
    		features,
    		selected,
    		billingType,
    		showBillingType,
    		isAddon,
    		toggleSelection,
    		toggleBillingType
    	});

    	$$self.$inject_state = $$props => {
    		if ('purchased' in $$props) $$invalidate(2, purchased = $$props.purchased);
    		if ('title' in $$props) $$invalidate(3, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(4, subtitle = $$props.subtitle);
    		if ('salePrice' in $$props) $$invalidate(5, salePrice = $$props.salePrice);
    		if ('actualPrice' in $$props) $$invalidate(6, actualPrice = $$props.actualPrice);
    		if ('features' in $$props) $$invalidate(7, features = $$props.features);
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    		if ('billingType' in $$props) $$invalidate(1, billingType = $$props.billingType);
    		if ('showBillingType' in $$props) $$invalidate(8, showBillingType = $$props.showBillingType);
    		if ('isAddon' in $$props) $$invalidate(9, isAddon = $$props.isAddon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selected,
    		billingType,
    		purchased,
    		title,
    		subtitle,
    		salePrice,
    		actualPrice,
    		features,
    		showBillingType,
    		isAddon,
    		toggleSelection,
    		toggleBillingType,
    		click_handler,
    		click_handler_1
    	];
    }

    class GoProCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			purchased: 2,
    			title: 3,
    			subtitle: 4,
    			salePrice: 5,
    			actualPrice: 6,
    			features: 7,
    			selected: 0,
    			billingType: 1,
    			showBillingType: 8,
    			isAddon: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GoProCard",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get purchased() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set purchased(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitle() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitle(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get salePrice() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set salePrice(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actualPrice() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actualPrice(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get features() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set features(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get billingType() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set billingType(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showBillingType() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showBillingType(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isAddon() {
    		throw new Error("<GoProCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isAddon(value) {
    		throw new Error("<GoProCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\GoPro\GoPro.svelte generated by Svelte v3.43.1 */

    const { console: console_1 } = globals;
    const file = "webviews\\components\\GoPro\\GoPro.svelte";

    // (140:0) {#if !loading}
    function create_if_block(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let goprocard0;
    	let updating_billingType;
    	let updating_selected;
    	let t2;
    	let goprocard1;
    	let updating_selected_1;
    	let t3;
    	let goprocard2;
    	let updating_selected_2;
    	let t4;
    	let goprocard3;
    	let updating_selected_3;
    	let t5;
    	let faq;
    	let t6;
    	let div2;
    	let button;
    	let t7;
    	let span;
    	let t8;
    	let t9_value = /*getTotalPrice*/ ctx[6]() + "";
    	let t9;
    	let button_class_value;
    	let button_disabled_value;
    	let current;
    	let mounted;
    	let dispose;

    	function goprocard0_billingType_binding(value) {
    		/*goprocard0_billingType_binding*/ ctx[9](value);
    	}

    	function goprocard0_selected_binding(value) {
    		/*goprocard0_selected_binding*/ ctx[10](value);
    	}

    	let goprocard0_props = {
    		purchased: /*hasPurchased*/ ctx[7]("DevEssentials") || /*hasPurchased*/ ctx[7]("pro"),
    		title: "Starter",
    		subtitle: "Dev Essentials, grids, carts, navs and more",
    		salePrice: /*billingType*/ ctx[4] === "monthly" ? 9 : 149,
    		features: [
    			"200+ components",
    			"React, Angular & Vue support",
    			"Premium Support",
    			"Lifetime access"
    		],
    		showBillingType: true
    	};

    	if (/*billingType*/ ctx[4] !== void 0) {
    		goprocard0_props.billingType = /*billingType*/ ctx[4];
    	}

    	if (/*devEssentialsLicense*/ ctx[3] !== void 0) {
    		goprocard0_props.selected = /*devEssentialsLicense*/ ctx[3];
    	}

    	goprocard0 = new GoProCard({ props: goprocard0_props, $$inline: true });
    	binding_callbacks.push(() => bind(goprocard0, 'billingType', goprocard0_billingType_binding));
    	binding_callbacks.push(() => bind(goprocard0, 'selected', goprocard0_selected_binding));

    	function goprocard1_selected_binding(value) {
    		/*goprocard1_selected_binding*/ ctx[11](value);
    	}

    	let goprocard1_props = {
    		isAddon: true,
    		purchased: /*hasPurchased*/ ctx[7]("E-commerce") || /*hasPurchased*/ ctx[7]("pro"),
    		title: "Ecommerce UI Kit",
    		subtitle: "Product grids, carts, navs and more",
    		salePrice: 59,
    		features: [
    			"200+ components",
    			"React, Angular & Vue (Coming Soon)",
    			"Premium Support",
    			"Lifetime access"
    		]
    	};

    	if (/*ecommerceLicense*/ ctx[0] !== void 0) {
    		goprocard1_props.selected = /*ecommerceLicense*/ ctx[0];
    	}

    	goprocard1 = new GoProCard({ props: goprocard1_props, $$inline: true });
    	binding_callbacks.push(() => bind(goprocard1, 'selected', goprocard1_selected_binding));

    	function goprocard2_selected_binding(value) {
    		/*goprocard2_selected_binding*/ ctx[12](value);
    	}

    	let goprocard2_props = {
    		isAddon: true,
    		purchased: /*hasPurchased*/ ctx[7]("webapp") || /*hasPurchased*/ ctx[7]("pro"),
    		title: "Web App UI Kit",
    		subtitle: "Dashboards and UI components",
    		salePrice: 159,
    		features: [
    			"550+ Web App components",
    			"React, Angular & Vue support",
    			"Premium Support",
    			"Lifetime access"
    		]
    	};

    	if (/*webappLicense*/ ctx[1] !== void 0) {
    		goprocard2_props.selected = /*webappLicense*/ ctx[1];
    	}

    	goprocard2 = new GoProCard({ props: goprocard2_props, $$inline: true });
    	binding_callbacks.push(() => bind(goprocard2, 'selected', goprocard2_selected_binding));

    	function goprocard3_selected_binding(value) {
    		/*goprocard3_selected_binding*/ ctx[13](value);
    	}

    	let goprocard3_props = {
    		isAddon: true,
    		purchased: /*hasPurchased*/ ctx[7]("marketing") || /*hasPurchased*/ ctx[7]("pro"),
    		title: "Marketing UI Kit",
    		subtitle: "Website components that convert",
    		salePrice: 79,
    		features: [
    			"200+ components",
    			"React, Angular & Vue support",
    			"Premium Support",
    			"Lifetime access"
    		]
    	};

    	if (/*marketingLicense*/ ctx[2] !== void 0) {
    		goprocard3_props.selected = /*marketingLicense*/ ctx[2];
    	}

    	goprocard3 = new GoProCard({ props: goprocard3_props, $$inline: true });
    	binding_callbacks.push(() => bind(goprocard3, 'selected', goprocard3_selected_binding));
    	faq = new FAQ({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Choose what best works for you";
    			t1 = space();
    			div0 = element("div");
    			create_component(goprocard0.$$.fragment);
    			t2 = space();
    			create_component(goprocard1.$$.fragment);
    			t3 = space();
    			create_component(goprocard2.$$.fragment);
    			t4 = space();
    			create_component(goprocard3.$$.fragment);
    			t5 = space();
    			create_component(faq.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			button = element("button");
    			t7 = text("Proceed to Checkout\r\n      ");
    			span = element("span");
    			t8 = text("$");
    			t9 = text(t9_value);
    			attr_dev(h2, "class", "heading-2 svelte-1lwqt0l");
    			add_location(h2, file, 141, 4, 3571);
    			attr_dev(div0, "class", "cards svelte-1lwqt0l");
    			add_location(div0, file, 142, 4, 3634);
    			attr_dev(div1, "class", "container svelte-1lwqt0l");
    			add_location(div1, file, 140, 2, 3542);
    			attr_dev(span, "class", "checkout__price svelte-1lwqt0l");
    			add_location(span, file, 222, 6, 6078);

    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(`checkout__btn no-margin ${/*getTotalPrice*/ ctx[6]() === 0
			? "checkout__btn--disabled"
			: ""}`) + " svelte-1lwqt0l"));

    			button.disabled = button_disabled_value = /*getTotalPrice*/ ctx[6]() === 0;
    			add_location(button, file, 214, 4, 5845);
    			attr_dev(div2, "class", "sticky svelte-1lwqt0l");
    			add_location(div2, file, 213, 2, 5819);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(goprocard0, div0, null);
    			append_dev(div0, t2);
    			mount_component(goprocard1, div0, null);
    			append_dev(div0, t3);
    			mount_component(goprocard2, div0, null);
    			append_dev(div0, t4);
    			mount_component(goprocard3, div0, null);
    			append_dev(div1, t5);
    			mount_component(faq, div1, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, button);
    			append_dev(button, t7);
    			append_dev(button, span);
    			append_dev(span, t8);
    			append_dev(span, t9);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*checkout*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const goprocard0_changes = {};
    			if (dirty & /*billingType*/ 16) goprocard0_changes.salePrice = /*billingType*/ ctx[4] === "monthly" ? 9 : 149;

    			if (!updating_billingType && dirty & /*billingType*/ 16) {
    				updating_billingType = true;
    				goprocard0_changes.billingType = /*billingType*/ ctx[4];
    				add_flush_callback(() => updating_billingType = false);
    			}

    			if (!updating_selected && dirty & /*devEssentialsLicense*/ 8) {
    				updating_selected = true;
    				goprocard0_changes.selected = /*devEssentialsLicense*/ ctx[3];
    				add_flush_callback(() => updating_selected = false);
    			}

    			goprocard0.$set(goprocard0_changes);
    			const goprocard1_changes = {};

    			if (!updating_selected_1 && dirty & /*ecommerceLicense*/ 1) {
    				updating_selected_1 = true;
    				goprocard1_changes.selected = /*ecommerceLicense*/ ctx[0];
    				add_flush_callback(() => updating_selected_1 = false);
    			}

    			goprocard1.$set(goprocard1_changes);
    			const goprocard2_changes = {};

    			if (!updating_selected_2 && dirty & /*webappLicense*/ 2) {
    				updating_selected_2 = true;
    				goprocard2_changes.selected = /*webappLicense*/ ctx[1];
    				add_flush_callback(() => updating_selected_2 = false);
    			}

    			goprocard2.$set(goprocard2_changes);
    			const goprocard3_changes = {};

    			if (!updating_selected_3 && dirty & /*marketingLicense*/ 4) {
    				updating_selected_3 = true;
    				goprocard3_changes.selected = /*marketingLicense*/ ctx[2];
    				add_flush_callback(() => updating_selected_3 = false);
    			}

    			goprocard3.$set(goprocard3_changes);
    			if ((!current || dirty & /*getTotalPrice*/ 64) && t9_value !== (t9_value = /*getTotalPrice*/ ctx[6]() + "")) set_data_dev(t9, t9_value);

    			if (!current || dirty & /*getTotalPrice*/ 64 && button_class_value !== (button_class_value = "" + (null_to_empty(`checkout__btn no-margin ${/*getTotalPrice*/ ctx[6]() === 0
			? "checkout__btn--disabled"
			: ""}`) + " svelte-1lwqt0l"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || dirty & /*getTotalPrice*/ 64 && button_disabled_value !== (button_disabled_value = /*getTotalPrice*/ ctx[6]() === 0)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(goprocard0.$$.fragment, local);
    			transition_in(goprocard1.$$.fragment, local);
    			transition_in(goprocard2.$$.fragment, local);
    			transition_in(goprocard3.$$.fragment, local);
    			transition_in(faq.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(goprocard0.$$.fragment, local);
    			transition_out(goprocard1.$$.fragment, local);
    			transition_out(goprocard2.$$.fragment, local);
    			transition_out(goprocard3.$$.fragment, local);
    			transition_out(faq.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(goprocard0);
    			destroy_component(goprocard1);
    			destroy_component(goprocard2);
    			destroy_component(goprocard3);
    			destroy_component(faq);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(140:0) {#if !loading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*loading*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*loading*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*loading*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	let getTotalPrice;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('GoPro', slots, []);
    	const vscode = acquireVsCodeApi();
    	let purchasedLicenses = [];
    	let loading = true;
    	let ecommerceLicense = false;
    	let webappLicense = false;
    	let marketingLicense = false;
    	let devEssentialsLicense = false;
    	let idToken = null;

    	// let refreshToken = null;
    	let email = null;

    	let billingType = "monthly";
    	let selectedCard = null;

    	onMount(async () => {
    		vscode.postMessage({ type: "getPurchasedLicenses" });
    		vscode.postMessage({ type: "getSelectedCard" });
    	});

    	const extensionMessageHandler = async event => {
    		const message = event.data; // The JSON data our extension sent

    		switch (message.type) {
    			case "gotPurchasedLicenses":
    				{
    					if (message.userDetails) {
    						purchasedLicenses = message.userDetails;
    					}

    					if (message.idToken) {
    						idToken = message.idToken;
    					}

    					if (message.email) {
    						email = message.email;
    					}

    					$$invalidate(5, loading = false);
    					break;
    				}
    			case "gotSelectedCard":
    				{
    					if (message.selectedCard) {
    						selectedCard = message.selectedCard;

    						if (selectedCard === "DevEssentials") {
    							$$invalidate(3, devEssentialsLicense = true);
    						} else if (selectedCard === "marketing") {
    							$$invalidate(2, marketingLicense = true);
    						} else if (selectedCard === "Ecommerce") {
    							$$invalidate(0, ecommerceLicense = true);
    						} else if (selectedCard === "webapp") {
    							$$invalidate(1, webappLicense = true);
    						}
    					}

    					break;
    				}
    		}
    	};

    	const hasPurchased = license => {
    		return purchasedLicenses.includes(license);
    	};

    	const checkout = () => {
    		let products = [];
    		let type = "LIFETIME";

    		if (ecommerceLicense) {
    			products.push("ECOMMERCE_LIFETIME");
    		}

    		if (webappLicense) {
    			products.push("WEBAPP_LIFETIME");
    		}

    		if (marketingLicense) {
    			products.push("MARKETING_LIFETIME");
    		}

    		if (devEssentialsLicense) {
    			if (billingType === "monthly") {
    				products.push("DEVESSENTIALS_MONTHLY");
    				type = "MONTHLY";
    			} else {
    				products.push("DEVESSENTIALS_LIFETIME");
    			}
    		}

    		fetch("https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/stripe/session/createV2", {
    			method: "POST",
    			body: JSON.stringify({ product: products, type, idToken, email })
    		}).then(res => res.json()).then(res => {
    			vscode.postMessage({ type: "openBrowser", url: res.data.url });
    		}).catch(error => console.log(error));
    	};

    	window.addEventListener("message", extensionMessageHandler);

    	onDestroy(() => {
    		window.removeEventListener("message", extensionMessageHandler);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<GoPro> was created with unknown prop '${key}'`);
    	});

    	function goprocard0_billingType_binding(value) {
    		billingType = value;
    		$$invalidate(4, billingType);
    	}

    	function goprocard0_selected_binding(value) {
    		devEssentialsLicense = value;
    		$$invalidate(3, devEssentialsLicense);
    	}

    	function goprocard1_selected_binding(value) {
    		ecommerceLicense = value;
    		$$invalidate(0, ecommerceLicense);
    	}

    	function goprocard2_selected_binding(value) {
    		webappLicense = value;
    		$$invalidate(1, webappLicense);
    	}

    	function goprocard3_selected_binding(value) {
    		marketingLicense = value;
    		$$invalidate(2, marketingLicense);
    	}

    	$$self.$capture_state = () => ({
    		vscode,
    		onDestroy,
    		onMount,
    		FAQ,
    		GoProCard,
    		purchasedLicenses,
    		loading,
    		ecommerceLicense,
    		webappLicense,
    		marketingLicense,
    		devEssentialsLicense,
    		idToken,
    		email,
    		billingType,
    		selectedCard,
    		extensionMessageHandler,
    		hasPurchased,
    		checkout,
    		getTotalPrice
    	});

    	$$self.$inject_state = $$props => {
    		if ('purchasedLicenses' in $$props) purchasedLicenses = $$props.purchasedLicenses;
    		if ('loading' in $$props) $$invalidate(5, loading = $$props.loading);
    		if ('ecommerceLicense' in $$props) $$invalidate(0, ecommerceLicense = $$props.ecommerceLicense);
    		if ('webappLicense' in $$props) $$invalidate(1, webappLicense = $$props.webappLicense);
    		if ('marketingLicense' in $$props) $$invalidate(2, marketingLicense = $$props.marketingLicense);
    		if ('devEssentialsLicense' in $$props) $$invalidate(3, devEssentialsLicense = $$props.devEssentialsLicense);
    		if ('idToken' in $$props) idToken = $$props.idToken;
    		if ('email' in $$props) email = $$props.email;
    		if ('billingType' in $$props) $$invalidate(4, billingType = $$props.billingType);
    		if ('selectedCard' in $$props) selectedCard = $$props.selectedCard;
    		if ('getTotalPrice' in $$props) $$invalidate(6, getTotalPrice = $$props.getTotalPrice);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ecommerceLicense, webappLicense, marketingLicense, devEssentialsLicense, billingType*/ 31) {
    			$$invalidate(6, getTotalPrice = () => {
    				let totalPrice = 0;

    				if (ecommerceLicense) {
    					totalPrice += 59;
    				}

    				if (webappLicense) {
    					totalPrice += 159;
    				}

    				if (marketingLicense) {
    					totalPrice += 79;
    				}

    				if (devEssentialsLicense) {
    					if (billingType === "monthly") {
    						totalPrice += 9;
    					} else {
    						totalPrice += 149;
    					}
    				}

    				return totalPrice;
    			});
    		}
    	};

    	return [
    		ecommerceLicense,
    		webappLicense,
    		marketingLicense,
    		devEssentialsLicense,
    		billingType,
    		loading,
    		getTotalPrice,
    		hasPurchased,
    		checkout,
    		goprocard0_billingType_binding,
    		goprocard0_selected_binding,
    		goprocard1_selected_binding,
    		goprocard2_selected_binding,
    		goprocard3_selected_binding
    	];
    }

    class GoPro extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GoPro",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new GoPro({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=GoPro.js.map
