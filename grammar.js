const LOWER_CASE_LETTER = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 
    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
    's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

const UPPER_CASE_LETTER = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
    'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

const DIGIT = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const SYMBOL = [
    '+'
];

// LINT '==', '/=' and '<>' are illegal operators
const BINOP = [
    '=','!=','<','<=','>','>=','==','/=','<>'
];

const ARITHOP = [
    '+','-','*','/','\\','**','&','?','^'
];

const UNDERLINE = '_';
const APOSTROPHE = '’';
const HASH = '#';

module.exports = grammar({
    name: 'lp',

    inline: $ => [
        $._head,
        $._literal,
        $._term,
        $._simpleterm,
    ],

    conflicts: $ => [
        [$.condition],
        [$.condition, $.negation],
        [$.condition, $.aggregate_literals],

        // syntatic sugar of body aggregate element
        // eg: { foo }
        // eg: { foo; foo }
        [$.aggregate_element],
        [$.choice_element],
        [$.terms, $.aggregate_literals],
        [$.terms, $.condition],
    ],

    extras: $ => [
        /\s|\\\r?\n/,
        $.comment,
    ],

    rules: {

        // TODO: directives
        // #external, #include, #program
        // TODO: difference constraints
        // &diff

        program: $ => seq(
            repeat($._statement),
        ),

        _statement: $ => choice(
            $.fact,
            $.rule,
            $.integrity_constraint,
            $.optimization,
            $.show_statement,
        ),

        fact: $ => seq(
            $.head,
            '.'
        ),

        rule: $ => seq(
            $.head,
            ':-',
            $.body,
            '.'
        ),

        integrity_constraint: $ => seq(
            ':-',
            $.body,
            '.'
        ),

        optimization: $ => seq(
            ':~',
            $.body,
            '.',
            optional(seq(
                '[',
                sepBy(',', $.prioritized_term),
                ']',
            ))
        ),

        head: $ => choice(
            $.disjunction,
            $.condition,
            $.choice
        ),

        disjunction: $ => sepBy1(';', $.classical_literal),

        classical_literal: $ => seq(
            optional('-'),
            choice(
                $.constant,
                $.function
            ),
        ),

        // Choice aka head aggregate
        choice: $ => seq(
            field('left', optional(alias($.left_guard,$.guard))),
            optional($.aggregate_function),
            '{',
            sepBy(';',$.choice_element),
            '}',
            field('right', optional(alias($.right_guard,$.guard))),
        ),

        choice_element: $ => choice(
            // shortcut
            sepBy1(';', alias($.aggregate_literals, $.literals)),
            // default
            seq(
                $.terms,
                optional(seq(
                    ':',
                    optional(seq(
                        $._literal,
                        optional(seq(
                            ':',
                            optional(alias($.aggregate_literals, $.literals))
                        ))
                    ))
                ))
            ),
        ),

        aggregate_literals: $ => sepBy1(',', $._literal),

        left_guard: $ => seq(
            $._term,
            optional(field('operator', choice(...BINOP))),
        ),

        right_guard: $ => seq(
            optional(field('operator', choice(...BINOP))),
            $._term
        ),

        // TODO
        body: $ => sepBy1(choice(',',';'), $._literal),

        aggregate: $ => seq(
            field('left', optional(alias($.left_guard,$.guard))),
            optional($.aggregate_function),
            '{',
            sepBy(';',$.aggregate_element),
            '}',
            field('right', optional(alias($.right_guard,$.guard))),
        ),

        aggregate_function: $ => token(seq(
            HASH,
            repeat1(choice(
                ...UNDERLINE,
                ...APOSTROPHE,
                ...LOWER_CASE_LETTER,
                ...UPPER_CASE_LETTER,
                ...DIGIT,
                ...SYMBOL
            )),
        )),

        aggregate_element: $ => choice(
            // shortcut
            sepBy1(';', alias($.aggregate_literals, $.literals)),
            // default
            seq(
                $.terms,
                ':',
                optional(seq(
                    ':',
                    optional(alias($.aggregate_literals, $.literals))
                ))
            ),
        ),

        //aggregate_element: $ => choice(
        //    seq(
        //        $.terms,
        //        optional(seq(
        //            ':',
        //            alias($.aggregate_literals, $.literals)
        //        ))
        //    ),
        //    // 3.7 - shortcut (syntatic sugar)
        //    sepBy1(';', alias($.aggregate_literals, $.literals))
        //),

        literals: $ => sepBy1(choice(',',';'), $._literal),

        _literal: $ => choice(
            $.comparison,
            $.condition,
            $.negation,
            $._term,
            $.aggregate
        ),

        comparison: $ => seq(
            field('left',$._term),
            field('operator', choice(...BINOP)),
            field('right',$._term),
        ),

        // TODO: check if the same on head and body
        condition: $ => prec.dynamic(-2,seq(
            $._term,
            ':',
            $._literal,
            optional(seq(
                repeat(seq(
                    ',',
                    $._literal
                )),
            )),
        )),

        negation: $ => seq(
            'not',
            $._literal
        ),

        _aggregate: $ => choice(
            $.terms,
            $.pooling,
        ),

        // tuple of terms
        terms: $ => sepBy1(',', $._term),

        pooling: $ => sepBy2(';', $.terms),

        // Terms
        _term: $ => choice(
            $.interval,
            $.tuple,
            $._simpleterm,
            $._function,
            $.prioritized_term
        ),

        _simpleterm: $ => choice(
            $._constant,
            $.string,
            $.variable,
            $.anonymous_variable,
            $.special_constant,
        ),

        prioritized_term: $ => seq(
            field('term',$._term),
            '@',
            field('priority',$.integer)
        ),

        _constant: $ => choice(
            $.constant,
            $.boolean,
            $.integer
        ),

        constant: $ => token(seq(
            repeat(UNDERLINE),
            choice(...LOWER_CASE_LETTER),
            repeat(choice(
                ...UNDERLINE,
                ...APOSTROPHE,
                ...LOWER_CASE_LETTER,
                ...UPPER_CASE_LETTER,
                ...DIGIT
            )),
        )),

        boolean: $ => choice(
            token('#true'),
            token('#false')
        ),

        _digit: $ => choice(...[...DIGIT].map(c => token(c))),

        _digit_immed: $ => choice(choice(...[...DIGIT].map(c => token.immediate(c)))),

        integer: $ => seq(
            $._digit,
            repeat($._digit_immed)
        ),

        string: $ => seq(
            '"',
            repeat(choice(
                token.immediate(prec(3, new RegExp('[^"\n]'))),
                $.escape_sequence
            )),
            token.immediate('"'),
        ),

        escape_sequence: $ => token.immediate(choice('\\\\', '\\n', '\\"')),

        variable: $ => token(seq(
            repeat(UNDERLINE),
            choice(...UPPER_CASE_LETTER),
            repeat(choice(
                ...UNDERLINE,
                ...APOSTROPHE,
                ...LOWER_CASE_LETTER,
                ...UPPER_CASE_LETTER,
                ...DIGIT
            )),
        )),

        _function: $ => choice(
            $.function,
            $.external_function,
            $.binary_arithmetic_function,
            $.unary_arithmetic_function,
        ),

        function: $ => seq(
            $.constant,
            '(',
            $._aggregate,
            ')'
        ),

        external_function: $ => seq(
            '@',
            $.constant,
            '(',
            $._aggregate,
            ')'
        ),

        binary_arithmetic_function: $ => prec.left(1,seq(
            field('left', $._term),
            field('operator', choice(...ARITHOP)),
            field('right', $._term),
        )),

        unary_arithmetic_function: $ => prec.left(choice(
            seq(
                '|',
                field('argument',$._term),
                '|',
            ),
            seq(
                choice('-','~'),
                field('argument',$._term),
            ),
        )),

        tuple: $ => seq(
            '(',
            optional($._aggregate),
            ')'
        ),

        interval: $ => seq(
            field('low',$._simpleterm),
            field('operator','..'),
            field('high',$._simpleterm),
        ),

        anonymous_variable: $ => token(UNDERLINE),

        special_constant: $ => choice(token('#inf'), token('#sup')),

        show_statement: $ => prec(1,seq(
            '#show',
            optional(choice(
                seq(
                    $.constant,
                    '/',
                    $.integer
                ),
                seq(
                    $._term,
                    ':',
                    $.literals
                )
            )),
            '.'
        )),

        comment: $ => choice(
            prec(2,new RegExp('%([^\\*\n][^\n]*)?')),
            prec(3,new RegExp('%\\*([^\\*]|\\*[^%])*\\*%')),
        ),

    }
});

function digit(set,tok=token.immediate) {
    return choice(...set.map(c => tok(c)))
}

function sepBy2(sep, rule) {
    return seq(rule, sep, sepBy1(sep,rule))
}

function sepBy1(sep, rule) {
    return seq(rule, repeat(seq(sep, rule)))
}

function sepBy(sep, rule) {
    return optional(sepBy1(sep, rule))
}
