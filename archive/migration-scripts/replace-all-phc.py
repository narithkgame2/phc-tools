import re

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Exact Replacements
    replacements = [
        ('PROPERTY HUB CAMBODIA · CO-BROKE SYNDICATION NETWORK', 'REALESTATE.COM.KH · CO-BROKE SYNDICATION NETWORK'),
        ('PROPERTY HUB CAMBODIA · CO-BROKE SYNDICATION', 'REALESTATE.COM.KH · CO-BROKE SYNDICATION'),
        ('PROPERTY HUB CAMBODIA · WEEKLY INVESTMENT BRIEF', 'REALESTATE.COM.KH · WEEKLY INVESTMENT BRIEF'),
        ('PROPERTY HUB CAMBODIA · EXECUTIVE DIGEST', 'REALESTATE.COM.KH · EXECUTIVE DIGEST'),
        ('PROPERTY HUB CAMBODIA · VISUAL CATALOG', 'REALESTATE.COM.KH · VISUAL CATALOG'),
        ('PROPERTY HUB CAMBODIA', 'REALESTATE.COM.KH'),
        ('Property Hub Cambodia Bot', 'Realestate.com.kh Bot'),
        ('Property Hub Cambodia partner ledger', 'Realestate.com.kh partner ledger'),
        ('Property Hub Cambodia prepares', 'Realestate.com.kh prepares'),
        ('Property Hub Cambodia guarantees', 'Realestate.com.kh guarantees'),
        ('Property Hub Cambodiaは全物件について', 'Realestate.com.khは全物件について'),
        ('Property Hub Cambodiaが納税申告', 'Realestate.com.khが納税申告'),
        ('Verified by Property Hub Cambodia', 'Verified by Realestate.com.kh'),
        ('Property Hub Cambodia', 'Realestate.com.kh'),
        ('PHC HANDPICKED INVESTMENT COMPARISON MATRIX', 'REALESTATE.COM.KH HANDPICKED INVESTMENT COMPARISON MATRIX'),
        ('PHC BROKER SAFE HARBOR CERTIFICATE', 'REALESTATE.COM.KH BROKER SAFE HARBOR CERTIFICATE'),
        ('PHC CO-BROKE DEAL REGISTRATION', 'REALESTATE.COM.KH CO-BROKE DEAL REGISTRATION'),
        ('PHC CO-BROKE SYNDICATION', 'REALESTATE.COM.KH CO-BROKE SYNDICATION'),
        ('PHC WEEKLY DIGEST SCHEDULER STATUS', 'REALESTATE.COM.KH WEEKLY DIGEST SCHEDULER STATUS'),
        ('PHC WEEKLY DIGEST', 'REALESTATE.COM.KH WEEKLY DIGEST'),
        ('PHC VISUAL CATALOG', 'REALESTATE.COM.KH VISUAL CATALOG'),
        ('Exclusive PHC Representation', 'Exclusive Realestate.com.kh Representation'),
        ('LIST YOUR PROPERTY WITH PHC', 'LIST YOUR PROPERTY WITH REALESTATE.COM.KH'),
        ('Listing submitted to PHC!', 'Listing submitted to Realestate.com.kh!'),
        ('Nick and the PHC valuation team', 'Nick and the Realestate.com.kh valuation team'),
        ('PHC valuation team', 'Realestate.com.kh valuation team'),
        ('PHC inspection calendar', 'Realestate.com.kh inspection calendar'),
        ('PHC Tour Calendar', 'Realestate.com.kh Tour Calendar'),
        ('PHC Calendar', 'Realestate.com.kh Calendar'),
        ('PHC partner commercial banks', 'Realestate.com.kh partner commercial banks'),
        ('PHCの掲載物件', 'Realestate.com.khの掲載物件'),
        ('50% PHC / 50% Sub-Agent', '50% REAKH / 50% Sub-Agent'),
        ('PHC Bot', 'Realestate.com.kh Bot'),
        ('Open PHC Catalog', 'Open Realestate.com.kh Catalog'),
        ('PHC DUE DILIGENCE AUDIT', 'REALESTATE.COM.KH DUE DILIGENCE AUDIT'),
        ('PHC AUDIT VERDICT', 'REALESTATE.COM.KH AUDIT VERDICT'),
        ('PHC_Time_Square_8_Factsheet.pdf', 'Realestate_Time_Square_8_Factsheet.pdf'),
        ("'PHC-'", "'REAKH-'"),
        ('"PHC-"', '"REAKH-"'),
        ('`PHC-`', '`REAKH-`'),
        ('PHC-832', 'REAKH-832'),
        ('PHC-842', 'REAKH-842')
    ]

    count = 0
    for old_val, new_val in replacements:
        if old_val in content:
            content = content.replace(old_val, new_val)
            count += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned {filepath}: applied {count} replacement rules.")

clean_file('phc-tools/staging-bot-poller.cjs')
clean_file('phc-tools/bot-system-cockpit.html')
