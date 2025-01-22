https://emergent.unpythonic.net/software/hershey

> The structure is bascially as follows: each character consists of a number
> 1->4000 (not all used) in column 0:4, the number of vertices in columns 5:7,
> the left hand position in column 8, the right hand position in column 9, and
> finally the vertices in single character pairs. All coordinates are given
> relative to the ascii value of 'R'. If the coordinate value is " R" that
> indicates a pen up operation.
>
> As an example consider the 8th symbol
>
> `8 9MWOMOV RUMUV ROQUQ`
>
> It has 9 coordinate pairs (this includes the left and right position).  
> The left position is 'M' - 'R' = -5  
> The right position is 'W' - 'R' = 5  
> The first coordinate is "OM" = (-3,-5)  
> The second coordinate is "OV" = (-3,4)  
> Raise the pen " R"  
> Move to "UM" = (3,-5)  
> Draw to "UV" = (3,4)  
> Raise the pen " R"  
> Move to "OQ" = (-3,-1)  
> Draw to "UQ" = (3,-1)  
> Drawing this out on a piece of paper will reveal it represents an 'H'.
