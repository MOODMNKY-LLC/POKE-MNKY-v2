# Team 1 Page Formula Reference

> **Source**: Google Sheet - "Team 1" tab  
> **Last Updated**: 2026-01-12

This document provides formulas to extract specific information from the Team 1 page structure.

---

## 📋 Page Structure Overview

### Key Sections:
- **Header** (Rows 1-8): Team name, coach, conference, division
- **Draft Picks** (Rows 2-11): Columns C-E
- **Transactions** (Column F-G): Free agency, trades, tera changes
- **Schedule** (Columns H-I): Weekly matchups
- **Results** (Column J): Win-Loss record
- **Weekly Stats** (Rows 22-29): Pokemon used per week with kills
- **Tera Captains** (Rows 13-16): Tera-typed Pokemon

---

## 🔤 Basic Information Extraction

### 1. Team Name
**Location**: A2  
**Value**: "Arkansas Fighting Hogs"

**Formulas**:
```excel
=A2
=IF(A2<>"",A2,"")
=TRIM(A2)
```

### 2. Coach Name
**Location**: A4  
**Value**: "Jordan"

**Formulas**:
```excel
=A4
=IF(A4<>"",A4,"")
```

### 3. Conference
**Location**: A6  
**Value**: "Lance"

**Formulas**:
```excel
=A6
```

### 4. Division
**Location**: A8  
**Value**: "Kanto"

**Formulas**:
```excel
=A8
```

---

## 📝 Draft Picks Extraction

### Draft Picks Structure:
- **Column C**: Round/Pick number (e.g., "Round 1 (Pick 1)")
- **Column D**: Pokemon name (e.g., "Iron Valiant")
- **Column E**: Point value (e.g., "19")
- **Rows**: 2-11 (10 picks total)

### Extract All Draft Picks

**Pokemon Names** (Column D):
```excel
=D2:D11
=FILTER(D2:D11,D2:D11<>"")
```

**Point Values** (Column E):
```excel
=E2:E11
=FILTER(E2:E11,E2:E11<>"")
```

**Pokemon + Points** (Combined):
```excel
=D2:E11
=FILTER(D2:E11,D2:D11<>"")
```

### Extract Specific Draft Pick

**Round 1 Pick** (Row 2):
```excel
=D2          (Pokemon name)
=E2          (Point value)
=CONCATENATE(D2," (",E2," pts)")  (Combined)
```

**Round 2 Pick** (Row 3):
```excel
=D3
=E3
```

**Nth Pick** (Dynamic):
```excel
=INDEX(D2:D11,1)   (1st pick)
=INDEX(D2:D11,2)   (2nd pick)
=INDEX(D2:D11,ROW()-1)  (If formula is in row 3, gets 2nd pick)
```

### Draft Statistics

**Total Draft Points**:
```excel
=SUM(E2:E11)
=SUMPRODUCT((D2:D11<>"")*E2:E11)  (Ignores empty cells)
```

**Count of Drafted Pokemon**:
```excel
=COUNTA(D2:D11)
=COUNTIF(D2:D11,"<>")
=COUNTIFS(D2:D11,"<>",E2:E11,"<>0")
```

**Average Point Value**:
```excel
=AVERAGE(E2:E11)
=AVERAGEIF(E2:E11,"<>0")
```

**Highest Point Value**:
```excel
=MAX(E2:E11)
```

**Lowest Point Value**:
```excel
=MIN(E2:E11)
```

**Find Pokemon by Round**:
```excel
=INDEX(D2:D11,MATCH("Round 1*",C2:C11,0))  (Finds Round 1 Pokemon)
```

---

## 🔄 Transactions Extraction

### Transaction Structure:
- **Column F**: Pokemon name (Free agency additions)
- **Column G**: Transaction type (e.g., "Dropping: [Pokemon]")
- **Rows**: 2-11 (aligned with draft picks)

### Extract All Transactions

**Added Pokemon** (Column F):
```excel
=F2:F11
=FILTER(F2:F11,F2:F11<>"")
```

**Dropped Pokemon** (Column G - extract from "Dropping: [Name]"):
```excel
=RIGHT(G2,LEN(G2)-FIND(":",G2)-1)  (Extracts name after "Dropping: ")
```

**All Transactions** (Combined):
```excel
=F2:G11
```

### Transaction Counts

**Total Additions**:
```excel
=COUNTA(F2:F11)
```

**Total Drops**:
```excel
=COUNTIF(G2:G11,"*Dropping*")
```

---

## 📅 Schedule Extraction

### Schedule Structure:
- **Column H**: Week number (e.g., "Week 1", "Playoffs (Round 1)")
- **Column I**: Opponent name
- **Column J**: Result (W/L)
- **Rows**: 2-16

### Extract Schedule Data

**All Weeks**:
```excel
=H2:H16
=I2:I16  (Opponents)
=J2:J16  (Results)
```

**Regular Season Only** (Weeks 1-10):
```excel
=FILTER(H2:H11,LEFT(H2:H11,4)="Week")
=FILTER(I2:I11,LEFT(H2:H11,4)="Week")
=FILTER(J2:J11,LEFT(H2:H11,4)="Week")
```

**Playoffs Only**:
```excel
=FILTER(H2:H16,LEFT(H2:H16,8)="Playoffs")
=FILTER(I2:I16,LEFT(H2:H16,8)="Playoffs")
```

### Schedule Statistics

**Total Record** (from J16):
```excel
=J16  (Returns "Record: 3-7")
```

**Extract Wins** (from J16):
```excel
=VALUE(LEFT(MID(J16,FIND(":",J16)+1,10),FIND("-",MID(J16,FIND(":",J16)+1,10))-1))
```

**Extract Losses** (from J16):
```excel
=VALUE(RIGHT(MID(J16,FIND(":",J16)+1,10),LEN(MID(J16,FIND(":",J16)+1,10))-FIND("-",MID(J16,FIND(":",J16)+1,10))))
```

**Count Wins** (from individual results):
```excel
=COUNTIF(J2:J11,"W")
```

**Count Losses**:
```excel
=COUNTIF(J2:J11,"L")
```

**Win Percentage**:
```excel
=COUNTIF(J2:J11,"W")/(COUNTIF(J2:J11,"W")+COUNTIF(J2:J11,"L"))
```

---

## 📊 Weekly Stats Extraction

### Weekly Stats Structure:
- **Rows 22-29**: Pokemon used per week with kill counts
- **Columns A-B**: Week 1 (Team, Kills)
- **Columns C-D**: Week 2 (Team, Kills)
- **Columns E-F**: Week 3 (Team, Kills)
- **Columns G-H**: Week 4 (Team, Kills)
- **Columns I-J**: Week 5 (Team, Kills)
- **And so on...**

### Extract Weekly Data

**Week 1 Pokemon**:
```excel
=A23:A28  (Pokemon names)
=B23:B28  (Kill counts)
```

**Week 1 Total Kills**:
```excel
=SUM(B23:B28)
=B29  (If totals row exists)
```

**All Week 1 Data**:
```excel
=A23:B28
```

### Extract Specific Week Stats

**Week N Pokemon** (where N = week number):
```excel
=OFFSET(A23,0,(N-1)*2,6,1)  (Pokemon names)
=OFFSET(B23,0,(N-1)*2,6,1)  (Kill counts)
```

**Week N Total Kills**:
```excel
=SUM(OFFSET(B23,0,(N-1)*2,6,1))
```

### Weekly Statistics

**Total Kills Across All Weeks**:
```excel
=SUM(B23,B29,D29,F29,H29,J29)  (Sum of totals rows)
```

**Average Kills Per Week**:
```excel
=AVERAGE(B29,D29,F29,H29,J29)
```

**Most Kills in a Single Week**:
```excel
=MAX(B29,D29,F29,H29,J29)
```

**Pokemon with Most Kills** (across all weeks):
```excel
=INDEX(A23:A28,MATCH(MAX(B23:B28,D23:D28,F23:F28,H23:H28,J23:J28),B23:B28,0))
```

---

## ⚡ Tera Captains Extraction

### Tera Captains Structure:
- **Rows 15-16**: Tera captain Pokemon names
- **Column D**: Pokemon names

### Extract Tera Captains

**All Tera Captains**:
```excel
=D15:D16
=FILTER(D15:D16,D15:D16<>"")
```

**Count Tera Captains**:
```excel
=COUNTA(D15:D16)
```

**Tera Point Balance** (E18):
```excel
=E18
```

---

## 🎯 Advanced Extraction Formulas

### Extract Team Name from Any Team Page

**Dynamic Formula** (works for any team sheet):
```excel
=INDIRECT("'"&SHEETNAME()&"'!A2")
```

### Extract All Draft Picks as Array

**For use in other formulas**:
```excel
=D2:D11  (Returns array)
=TEXTJOIN(", ",TRUE,D2:D11)  (Returns comma-separated string)
```

### Find Pokemon in Draft Picks

**Check if Pokemon is drafted**:
```excel
=IF(COUNTIF(D2:D11,"Iron Valiant")>0,"Drafted","Not Drafted")
```

**Get round number for specific Pokemon**:
```excel
=MATCH("Iron Valiant",D2:D11,0)  (Returns position, e.g., 1 for Round 1)
```

### Extract Opponent from Schedule

**Get opponent for specific week**:
```excel
=INDEX(I2:I11,MATCH("Week 1",H2:H11,0))  (Returns opponent for Week 1)
```

### Calculate Win Streak

**Current win streak** (from results column):
```excel
=IF(J11="W",IF(J10="W",IF(J9="W",3,2),1),0)  (Checks last 3 results)
```

---

## 📐 Range References Quick Reference

| Data | Range | Description |
|------|-------|-------------|
| Team Name | `A2` | Team name |
| Coach | `A4` | Coach name |
| Conference | `A6` | Conference name |
| Division | `A8` | Division name |
| Draft Picks | `D2:E11` | All draft picks with points |
| Transactions | `F2:G11` | Free agency and trades |
| Schedule | `H2:I16` | Weekly schedule |
| Results | `J2:J16` | Win/Loss results |
| Weekly Stats | `A22:Z29` | Pokemon stats per week |
| Tera Captains | `D15:D16` | Tera captain Pokemon |
| Record | `J16` | Overall record |

---

## 🔧 Formula Templates

### Template 1: Extract All Team Data
```excel
Team Name: =A2
Coach: =A4
Conference: =A6
Division: =A8
Total Draft Points: =SUM(E2:E11)
Record: =J16
Tera Captains: =TEXTJOIN(", ",TRUE,D15:D16)
```

### Template 2: Draft Summary
```excel
Draft Picks: =COUNTA(D2:D11)
Total Points: =SUM(E2:E11)
Average Points: =AVERAGE(E2:E11)
Highest Pick: =MAX(E2:E11)
Lowest Pick: =MIN(E2:E11)
```

### Template 3: Season Summary
```excel
Wins: =COUNTIF(J2:J11,"W")
Losses: =COUNTIF(J2:J11,"L")
Win %: =COUNTIF(J2:J11,"W")/(COUNTIF(J2:J11,"W")+COUNTIF(J2:J11,"L"))
Total Kills: =SUM(B29,D29,F29,H29,J29)
```

---

## 💡 Tips

1. **Use FILTER()** to exclude empty cells when extracting arrays
2. **Use INDEX()** for dynamic row/column references
3. **Use OFFSET()** for relative positioning (e.g., weekly stats)
4. **Use TEXTJOIN()** to combine multiple values into a single string
5. **Use INDIRECT()** for dynamic sheet references
6. **Use MATCH()** to find positions within arrays
7. **Use COUNTIF()** for conditional counting

---

**Note**: These formulas are based on the current Team 1 page structure. If the structure changes, formulas may need to be updated accordingly.
