<?php

namespace Tests\Unit;

use App\Support\Phone;
use PHPUnit\Framework\TestCase;

class PhoneTest extends TestCase
{
    public function test_malagasy_numbers_are_normalized_to_local_digits(): void
    {
        $expected = '0341234567';

        self::assertSame($expected, Phone::normalize('034 12 345 67'));
        self::assertSame($expected, Phone::normalize('+261 34 12 345 67'));
        self::assertSame($expected, Phone::normalize('+261 034 12 345 67'));
        self::assertSame($expected, Phone::normalize('261 034 12 345 67'));
    }

    public function test_mixed_international_and_local_prefix_is_valid(): void
    {
        self::assertTrue(Phone::isValid('+261 034 12 345 67'));
        self::assertTrue(Phone::isValid('261 033 00 444 00'));
        self::assertSame('0330044400', Phone::normalize('261 033 00 444 00'));
    }

    public function test_complete_foreign_e164_numbers_are_accepted_without_a_dial_code_selector(): void
    {
        self::assertTrue(Phone::isValid('+33 6 12 34 56 78'));
        self::assertSame('+33612345678', Phone::normalize('+33 6 12 34 56 78'));
        self::assertFalse(Phone::isValid('+261 20 12 34 56'));
        self::assertFalse(Phone::isValid('+33 123'));
    }
}
